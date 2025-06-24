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
// Get the receiver's initial balance

  let receiverInitialBalance: number;
  cy.database("find", "users", {
    id: ctx.contact!.id
  }).then((user: User) => {
    receiverInitialBalance = user.balance;
  });

  // Navigate to the new transaction form

  cy.getBySel("nav-top-new-transaction").click();
  cy.wait("@allUsers");

  // Search for and select the contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");
  cy.getBySel("user-list-item").first().click();

  // Enter payment details using the first payment transaction

  cy.getBySel("amount-input").type("35");
  cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");

  // Submit the payment

  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Verify success message appears

  cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Transaction Submitted!");

  // Switch to the receiver's account to verify the deposit

  cy.switchUserByXstate(ctx.contact!.username);

  // Navigate to personal transactions to see the received payment

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Verify the transaction appears in the receiver's transaction list

  cy.getBySel("transaction-item").first().should("contain", "Sushi dinner 🍣");
  cy.getBySel("transaction-item").first().should("contain", "$35");

  // Verify the receiver's balance has increased

  cy.database("find", "users", {
    id: ctx.contact!.id
  }).then((user: User) => {
    const expectedBalance = receiverInitialBalance + 35 * 100; // Convert dollars to cents

    expect(user.balance).to.equal(expectedBalance);
  });
 });
});
