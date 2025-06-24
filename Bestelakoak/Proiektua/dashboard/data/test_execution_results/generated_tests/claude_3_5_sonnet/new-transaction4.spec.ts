import Dinero from "dinero.js";
import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
type NewTransactionTestCtx = {
    allUsers?: User[];
    user?: User;
    contact?: User;
};
describe("New Transaction", function () {
    const ctx: NewTransactionTestCtx = {};
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/users*").as("allUsers");
        cy.intercept("GET", "/users/search*").as("usersSearch");
        cy.intercept("POST", "/transactions").as("createTransaction");
        cy.intercept("GET", "/notifications").as("notifications");
        cy.intercept("GET", "/transactions/public").as("publicTransactions");
        cy.intercept("GET", "/transactions").as("personalTransactions");
        cy.intercept("PATCH", "/transactions/*").as("updateTransaction");
        cy.database("filter", "users").then((users: User[]) => {
            ctx.allUsers = users;
            ctx.user = users[0];
            ctx.contact = users[1];
            return cy.loginByXstate(ctx.user.username);
        });
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
// Store initial receiver balance for later comparison

  let receiverInitialBalance: number;
  cy.database("find", "users", {
    id: ctx.contact!.id
  }).then(user => {
    receiverInitialBalance = user.balance;
  });

  // Navigate to new transaction form

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Search for the contact

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the contact from search results

  cy.getBySel("user-list-item").first().click();

  // Enter payment details using test data

  cy.getBySel("amount-input").type("35");
  cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");

  // Submit payment

  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Verify transaction appears in list

  cy.getBySel("transaction-list").should("be.visible");
  cy.getBySel("transaction-item").first().should("contain", "Sushi dinner 🍣").and("contain", "$35");

  // Switch to receiver's account to verify deposit

  cy.switchUserByXstate(ctx.contact!.username);

  // Navigate to personal transactions

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Verify the transaction appears in receiver's list

  cy.getBySel("transaction-item").first().should("contain", "Sushi dinner 🍣").and("contain", "$35").and("contain", "received");

  // Verify receiver's balance increased by payment amount

  cy.database("find", "users", {
    id: ctx.contact!.id
  }).then(user => {
    const expectedBalance = receiverInitialBalance + 3500; // $35.00 in cents

    expect(user.balance).to.equal(expectedBalance);
  });
 });
});
