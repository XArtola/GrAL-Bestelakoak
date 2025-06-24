import { User, Transaction } from "../../../src/models";
type NewTransactionCtx = {
    transactionRequest?: Transaction;
    authenticatedUser?: User;
};
describe("Transaction View", function () {
    const ctx: NewTransactionCtx = {};
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/transactions*").as("personalTransactions");
        cy.intercept("GET", "/transactions/public*").as("publicTransactions");
        cy.intercept("GET", "/transactions/*").as("getTransaction");
        cy.intercept("PATCH", "/transactions/*").as("updateTransaction");
        cy.intercept("GET", "/checkAuth").as("userProfile");
        cy.intercept("GET", "/notifications").as("getNotifications");
        cy.intercept("GET", "/bankAccounts").as("getBankAccounts");
        cy.database("find", "users").then((user: User) => {
            ctx.authenticatedUser = user;
            cy.loginByXstate(ctx.authenticatedUser.username);
            cy.database("find", "transactions", {
                receiverId: ctx.authenticatedUser.id,
                status: "pending",
                requestStatus: "pending",
                requestResolvedAt: "",
            }).then((transaction: Transaction) => {
                ctx.transactionRequest = transaction;
            });
        });
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
    });
    it("accepts a transaction request", () => {
// Verify we have a pending transaction request in context

  expect(ctx.transactionRequest).to.exist;

  // Click on the pending transaction request 

  cy.getBySel("transaction-item").contains(ctx.transactionRequest!.description).click();
  cy.wait("@getTransaction");

  // Verify transaction details are displayed

  cy.getBySel("transaction-detail-header").should("be.visible");
  cy.getBySel("transaction-amount").invoke("text").should("contain", ctx.transactionRequest!.amount);
  cy.getBySel("transaction-description").invoke("text").should("contain", ctx.transactionRequest!.description);

  // Accept the transaction request

  cy.getBySel("transaction-accept-request").click();
  cy.wait("@updateTransaction");

  // Verify the transaction status is updated to complete

  cy.getBySel("transaction-payment-status").should("have.text", "Complete");

  // Verify success message is shown

  cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Transaction Request Accepted");

  // Verify transaction no longer appears in pending requests

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");
  cy.getBySel("transaction-item").contains(ctx.transactionRequest!.description).parent().should("not.contain", "pending");
 });
});
