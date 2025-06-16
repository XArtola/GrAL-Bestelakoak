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
// Intercept comments API request

  cy.intercept("POST", "/comments").as("postComment");

  // First, find and click on the pending transaction request to view its details

  cy.getBySel("transaction-item").filter(`:contains(${ctx.transactionRequest?.description})`).first().click();

  // Wait for transaction details to load

  cy.wait("@getTransaction");

  // Verify we're on the transaction detail view

  cy.getBySel("transaction-detail-header").should("be.visible");

  // Create a test comment

  const testComment = "This is a test comment for the transaction";

  // Type the comment in the comment input field

  cy.getBySel("comment-input").type(testComment);

  // Submit the comment

  cy.getBySel("comment-submit").click();

  // Wait for the comment to be posted to the server

  cy.wait("@postComment");

  // Verify the comment appears in the list of comments

  cy.getBySel("comments-list").should("contain", testComment);

  // Verify user information appears with the comment

  cy.getBySel("comment-username").first().should("contain", ctx.authenticatedUser?.username);
 });
});
