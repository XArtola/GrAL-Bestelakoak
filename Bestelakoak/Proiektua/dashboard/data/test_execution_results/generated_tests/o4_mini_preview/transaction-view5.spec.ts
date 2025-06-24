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
    it("rejects a transaction request", () => {
// Locate the pending request in the personal feed and open its detail view
  cy.getBySel("transaction-item")
    .contains(ctx.transactionRequest!.description)
    .click();

  // Wait for the transaction detail to load
  cy.wait("@getTransaction");

  // Click the "Reject" button for the request
  cy.getBySel("transaction-reject-request").click();

  // Wait for the PATCH request to complete
  cy.wait("@updateTransaction");

  // Verify that the transaction status is now "Rejected"
  cy.getBySel("transaction-payment-status")
    .should("be.visible")
    .and("contain", "Rejected");
 });
});
