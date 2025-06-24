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
    it('does not display accept/reject buttons on completed request', () => {
    // It block: "does not display accept/reject buttons on completed request"

    // First, update the transaction request to mark it as complete.
    // Note: This step assumes an existing backend command or API to update the transaction.
    // If such a command isn't available, additional implementation is needed.
    cy.then(() => {
      if (ctx.transactionRequest && ctx.transactionRequest.id) {
        // Simulate updating the transaction to a completed state.
        // This can be done via a backend task or API call.
        // For demonstration purposes, we'll use cy.request to patch the transaction.
        return cy.request({
          method: "PATCH",
          url: `/transactions/${ctx.transactionRequest.id}`,
          body: { status: "complete", requestStatus: "accepted" },
        });
      } else {
        throw new Error("No transaction request available in context");
      }
    })
    .then(() => {
      // Reload the transaction view page for the updated transaction.
      cy.visit(`/transactions/${ctx.transactionRequest.id}`);
      cy.wait("@getTransaction");

      // Verify that accept and reject buttons are not visible on a completed request.
      cy.get('[data-test="accept-button"]').should("not.exist");
      cy.get('[data-test="reject-button"]').should("not.exist");

      // Optionally assert that a completed status indicator is visible.
      cy.get('[data-test="transaction-status"]').should("contain.text", "complete");
    });
  });
});
