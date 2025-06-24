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
    it('likes a transaction', () => {
    // likes a transaction
    // 1. Visit a transaction detail page
    // 2. Click the like button
    // 3. Assert that the like count increases and the button is active

    cy.database("find", "transactions", { receiverId: ctx.authenticatedUser!.id }).then((transaction: Transaction) => {
      // Visit the transaction detail page
      cy.visit(`/transaction/${transaction.id}`);
      cy.wait("@getTransaction");

      // Get the initial like count
      cy.getBySel("transaction-like-count")
        .invoke("text")
        .then((initialLikeCountText) => {
          const initialLikeCount = parseInt(initialLikeCountText, 10) || 0;

          // Click the like button
          cy.getBySel("transaction-like-button").click();

          // Assert the like button is active
          cy.getBySel("transaction-like-button").should("have.class", "MuiIconButton-colorPrimary");

          // Assert the like count increases by 1
          cy.getBySel("transaction-like-count").should(($span) => {
            const newCount = parseInt($span.text(), 10) || 0;
            expect(newCount).to.eq(initialLikeCount + 1);
          });
        });
    });
  });
});
