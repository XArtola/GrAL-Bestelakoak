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
// comments on a transaction

// Note: Need the exact data-test selectors for comment input, submit button, and comment list.

// Replace 'comment-input', 'comment-submit', and 'comment-item' with the real selectors.



if (!ctx.transactionRequest) {

throw new Error('No pending transaction request found in context');

}



// Visit the detail page for the pending transaction

cy.visit(`/transaction/${ctx.transactionRequest.id}`);



// Optionally intercept the comment POST if not already aliased

cy.intercept('POST', `/comments/${ctx.transactionRequest.id}`).as('postComment');



// Type a new comment

const commentText = 'This is a test comment';

cy.getBySel('comment-input').type(commentText);



// Submit the comment

cy.getBySel('comment-submit').click();



// Wait for the comment request to complete

cy.wait('@postComment');



// Verify the new comment appears in the list

cy.getBySel('comment-item').should('contain', commentText);
 });
});
