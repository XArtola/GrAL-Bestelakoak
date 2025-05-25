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
````typescript
// ...existing code...
it("comments on a transaction", () => {
// Ensure a transaction request is available
if (!ctx.transactionRequest) {
throw new Error("Test requires a transaction request to be present in the context.");
}

// Visit the transaction detail page
cy.visit(`/transaction/${ctx.transactionRequest.id}`);
cy.wait("@getTransaction");

const commentText = "This is a test comment!";
// Type a comment
cy.getBySel("transaction-comment-input").type(commentText);
// Click the submit comment button
cy.getBySel("transaction-comment-submit").click();

// Wait for the comment to be posted (assuming an intercept for comments if it exists, or a reasonable delay)
// cy.wait("@postComment"); // Add this if you have an intercept for POST /comments/*

// Verify the comment is displayed
cy.getBySel("comment-list").should("contain", commentText);
});
// ...existing code...
````
 });
});
