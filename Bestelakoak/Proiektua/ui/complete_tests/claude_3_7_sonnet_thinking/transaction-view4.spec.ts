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
// Find and click on the pending transaction request

  cy.getBySel("transaction-item").filter(`:contains("${ctx.transactionRequest.description}")`).first().click();

  // Wait for the transaction details to load

  cy.wait("@getTransaction");

  // Verify it's a pending request before accepting

  cy.getBySel("transaction-detail-header").should("contain", "pending");

  // Verify the accept button is visible

  cy.getBySel("transaction-accept-request").should("be.visible");

  // Click the accept button

  cy.getBySel("transaction-accept-request").click();

  // Wait for the update to complete

  cy.wait("@updateTransaction");

  // Verify the transaction status has changed to "complete"

  cy.getBySel("transaction-detail-header").should("contain", "complete");

  // Verify the accept button is no longer visible

  cy.getBySel("transaction-accept-request").should("not.exist");
 });
});
