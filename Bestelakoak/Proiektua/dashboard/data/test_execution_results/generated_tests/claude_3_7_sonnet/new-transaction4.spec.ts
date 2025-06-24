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
// Get initial balance of receiver (contact) for later comparison

  let receiverInitialBalance;
  cy.database("find", "users", {
    id: ctx.contact!.id
  }).then(user => {
    receiverInitialBalance = user.balance;
  });

  // Get initial balance of sender for later comparison

  let senderInitialBalance;
  cy.getBySel("sidenav-user-balance").then($balance => {
    const balanceText = $balance.text().replace(/[^0-9.-]+/g, "");
    senderInitialBalance = parseFloat(balanceText);
  });

  // Navigate to new transaction form

  cy.getBySel("nav-top-new-transaction").click();
  cy.wait("@allUsers");

  // Search for contact by name

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the first user from the search results

  cy.getBySel("user-list-item").first().click();

  // Enter payment amount using data from test info

  const paymentAmount = "35";
  const paymentDescription = "Sushi dinner 🍣";
  cy.getBySel("amount-input").type(paymentAmount);

  // Enter payment description

  cy.getBySel("transaction-create-description-input").type(paymentDescription);

  // Submit payment

  cy.getBySel("transaction-create-submit-payment").click();

  // Wait for transaction to be created

  cy.wait("@createTransaction");

  // Verify transaction was created successfully

  cy.getBySel("alert-bar-success").should("be.visible");
  cy.getBySel("transaction-item").first().should("contain", paymentDescription);

  // Verify sender's balance decreased

  cy.reload();
  cy.getBySel("sidenav-user-balance").then($balance => {
    const newBalanceText = $balance.text().replace(/[^0-9.-]+/g, "");
    const newBalance = parseFloat(newBalanceText);
    expect(newBalance).to.be.lessThan(senderInitialBalance);
  });

  // Log out and log in as receiver

  cy.getBySel("sidenav-signout").click();
  cy.loginByXstate(ctx.contact!.username);

  // Check receiver's updated balance

  cy.database("find", "users", {
    id: ctx.contact!.id
  }).then(user => {
    const expectedBalance = receiverInitialBalance + Number(paymentAmount) * 100; // Converting dollars to cents

    expect(user.balance).to.equal(expectedBalance);
  });

  // Verify transaction appears in the receiver's list

  cy.getBySel("transaction-list").should("be.visible");
  cy.getBySel("transaction-item").first().should("contain", paymentDescription).and("contain", `+$${paymentAmount}`);
 });
});
