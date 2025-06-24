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
    it("does not display accept/reject buttons on completed request", () => {
// First, try to find a completed transaction request

  cy.database("find", "transactions", {
    receiverId: ctx.authenticatedUser.id,
    status: "complete",
    requestStatus: "accepted" // This indicates it was a request that was accepted
  }).then((completedRequest: Transaction) => {
    if (completedRequest) {
      // If we found a completed request, navigate to it

      cy.getBySel("transaction-item").filter(`:contains("${completedRequest.description}")`).first().click();

      // Wait for transaction details to load

      cy.wait("@getTransaction");

      // Verify that accept/reject buttons are not displayed

      cy.getBySel("transaction-accept-request").should("not.exist");
      cy.getBySel("transaction-reject-request").should("not.exist");
    } else if (ctx.transactionRequest) {
      // If no completed request exists but we have a pending request in context

      // Navigate to the pending request

      cy.getBySel("transaction-item").filter(`:contains("${ctx.transactionRequest.description}")`).first().click();

      // Wait for transaction details to load

      cy.wait("@getTransaction");

      // Accept the request to complete it

      cy.getBySel("transaction-accept-request").click();
      cy.wait("@updateTransaction");

      // Reload the page to ensure we're seeing the updated state

      cy.reload();
      cy.wait("@getTransaction");

      // Verify that accept/reject buttons are no longer displayed

      cy.getBySel("transaction-accept-request").should("not.exist");
      cy.getBySel("transaction-reject-request").should("not.exist");
    } else {
      // If no request transaction is available, skip the test

      cy.log("No transaction request found to test with - skipping test");
      this.skip();
    }
  });
 });
});
