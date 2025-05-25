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
// Test adding a comment to a transaction
it("comments on a transaction", () => {
// Navigate to the first transaction in the personal feed
cy.getBySel("transaction-item").first().click();
cy.wait("@getTransaction");

// Add a comment to the transaction
const commentText = "This is a test comment.";
cy.getBySel("transaction-comment-input").type(commentText);
cy.getBySel("transaction-comment-submit").click();

// Wait for the comment to be posted
cy.wait("@postComment");

// Verify the comment appears in the transaction details
cy.getBySel("transaction-comment").should("contain", commentText);
});
 });
});
