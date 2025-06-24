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
    it('comments on a transaction', () => {
    // Ensure a transaction request is available

      expect(ctx.transactionRequest).to.exist;

      // Visit the transaction view page

      cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
      cy.wait("@getTransaction");

      // Wait for the comment input to be visible

      cy.getBySel("transaction-comment-input").should("be.visible");

      // Type a comment and submit

      const commentText = "This is a Cypress test comment";
      cy.getBySel("transaction-comment-input").type(commentText);
      cy.getBySel("transaction-comment-submit").click();

      // Assert the comment appears in the comment list

      cy.getBySel("transaction-comments-list").should("contain.text", commentText).and("contain.text", ctx.authenticatedUser!.firstName);

      // Optionally, ensure the input is cleared after submit

      cy.getBySel("transaction-comment-input").should("have.value", "");
  });
});
