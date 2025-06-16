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
// First, make sure we have a transaction request to work with

  cy.wrap(ctx.transactionRequest).should("exist");

  // Find and click on the pending transaction request

  cy.getBySel("transaction-item").filter(`:contains("${ctx.transactionRequest?.description}")`).first().click();

  // Wait for the transaction details to load

  cy.wait("@getTransaction");

  // Verify the transaction details show pending status

  cy.getBySel("transaction-detail-header").should("contain", "pending");
  cy.getBySel("transaction-accept-request").should("be.visible");

  // Accept the transaction request

  cy.getBySel("transaction-accept-request").click();

  // Wait for the transaction to be updated

  cy.wait("@updateTransaction");

  // Verify transaction is now complete

  cy.getBySel("transaction-detail-header").should("contain", "complete");
  cy.getBySel("transaction-payment-status").should("contain", "Complete");
 });
});
