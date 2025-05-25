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
// Click on the pending transaction in the list by matching its description
cy.getBySel("transaction-item")
.contains(ctx.transactionRequest!.description)
.click();
// Wait for the transaction details to load
cy.wait("@getTransaction");
// Click the accept-request button
cy.getBySel("transaction-accept-request").click();
// Wait for the PATCH call to complete
cy.wait("@updateTransaction");
// Verify the transaction status shows "complete"
cy.getBySel("transaction-status").should("contain", "complete");
// Confirm the request is no longer marked as pending in the feed
cy.getBySel("transaction-item")
.should("not.contain", ctx.transactionRequest!.description);
 });
});
