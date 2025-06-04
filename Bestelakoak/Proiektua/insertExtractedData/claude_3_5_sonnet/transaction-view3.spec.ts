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
    it("comments on a transaction", () => {
// Verify we have a transaction request in context

if (!ctx.transactionRequest) {

throw new Error("No transaction request found in context");

}



// Navigate to the transaction detail view

cy.visit(`/transaction/${ctx.transactionRequest.id}`);

cy.wait("@getTransaction");



// Get the comment input field

cy.getBySel("transaction-comment-input")

.should("be.visible")

.type("Great dinner! Thanks!");



// Submit the comment

cy.getBySel("transaction-comment-submit")

.should("be.visible")

.click();



// Wait for the comment to be posted

cy.wait("@postComment");



// Verify the comment appears in the transaction

cy.getBySel("comments-list")

.should("be.visible")

.and("contain", "Great dinner! Thanks!");



// Verify comment author is the authenticated user

cy.getBySel("comment-author")

.first()

.should("contain", ctx.authenticatedUser?.firstName)

.and("contain", ctx.authenticatedUser?.lastName);



// Verify timestamp is present

cy.getBySel("comment-timestamp")

.first()

.should("be.visible");


 });
});
