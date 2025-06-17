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
    it('accepts a transaction request', () => {
    // accepts a transaction request
    // 1. Visit the transaction request details page
    // 2. Click the "Accept" button
    // 3. Wait for the transaction update API call
    // 4. Assert that the transaction status is updated and accept/reject buttons are no longer visible
    cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
    cy.wait("@getTransaction");

    // Click the "Accept" button to accept the transaction request
    cy.getBySel("accept-request").should("be.visible").click();

    // Wait for the PATCH request to update the transaction
    cy.wait("@updateTransaction");

    // Assert that the accept/reject buttons are no longer visible
    cy.getBySel("accept-request").should("not.exist");
    cy.getBySel("reject-request").should("not.exist");

    // Assert that the transaction status is updated to "accepted"
    cy.getBySel("transaction-status").should("contain.text", "accepted");
  });
});
