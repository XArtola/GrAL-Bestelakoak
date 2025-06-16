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
// Assuming we need to navigate to a specific transaction first

  // We'll use the transaction request that was found in beforeEach

  if (!ctx.transactionRequest) {
    cy.log('No pending transaction request found for testing');
    return;
  }

  // Click on the pending transaction to view its details

  cy.getBySel("transaction-item").contains(`$${ctx.transactionRequest.amount}`).first().click();

  // Wait for transaction details to load

  cy.wait("@getTransaction");

  // Type a comment in the comment input field

  const commentText = "This is a test comment on the transaction";
  cy.getBySel("transaction-comment-input").should("be.visible").type(commentText);

  // Submit the comment

  cy.getBySel("transaction-comment-submit").should("be.visible").click();

  // Wait for the comment to be submitted and the transaction to refresh

  cy.wait("@getTransaction");

  // Verify that the comment appears in the transaction comments section

  cy.getBySel("transaction-comment-list").should("contain", commentText);

  // Verify the comment shows the current user's name

  cy.getBySel("transaction-comment-list").should("contain", ctx.authenticatedUser?.firstName).should("contain", ctx.authenticatedUser?.lastName);
 });
});
