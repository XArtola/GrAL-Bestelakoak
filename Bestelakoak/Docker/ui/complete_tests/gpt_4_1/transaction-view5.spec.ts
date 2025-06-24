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
    it('rejects a transaction request', () => {
    // "rejects a transaction request"
    //
    // This test simulates the user rejecting a pending transaction request and verifies the UI and backend update.

    cy.getBySelLike("transaction-item")
      .contains(ctx.transactionRequest!.description)
      .click(); // Open the transaction request

    cy.wait("@getTransaction");

    // Click the "Reject" button
    cy.getBySel("transaction-reject-request").should("be.visible").click();

    // Wait for the PATCH request to update the transaction
    cy.wait("@updateTransaction").its("response.statusCode").should("eq", 200);

    // Assert that the transaction status is updated in the UI
    cy.getBySel("transaction-request-status")
      .should("contain", "rejected")
      .and("be.visible");

    // Optionally, verify that accept/reject buttons are no longer visible
    cy.getBySel("transaction-accept-request").should("not.exist");
    cy.getBySel("transaction-reject-request").should("not.exist");
  });
});
