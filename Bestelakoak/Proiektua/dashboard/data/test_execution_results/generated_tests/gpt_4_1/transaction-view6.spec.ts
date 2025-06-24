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
    // does not display accept/reject buttons on completed request
    // 1. Mark the transaction request as completed (simulate accepting or rejecting).
    // 2. Visit the transaction view page for the completed request.
    // 3. Assert that accept/reject buttons are not visible.

    cy.wrap(ctx.transactionRequest).should("exist");

    // Complete the transaction request by updating its status
    cy.request("PATCH", `/transactions/${ctx.transactionRequest!.id}`, {
      status: "complete",
      requestStatus: "accepted",
      requestResolvedAt: new Date().toISOString(),
    }).then(() => {
      // Visit the transaction view page
      cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
      cy.wait("@getTransaction");

      // Assert that accept/reject buttons are not present
      cy.getBySel("transaction-accept-request").should("not.exist");
      cy.getBySel("transaction-reject-request").should("not.exist");
    });
  });
});
