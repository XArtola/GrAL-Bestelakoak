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
    /* it("likes a transaction") */
    // Step 1: Verify that the transaction item is visible
    cy.getBySel("transaction-item").should("exist");

    // Step 2: Click on the like button within the first transaction item
    cy.getBySel("transaction-item")
      .first()
      .within(() => {
        cy.getBySel("like-button").click();
      });

    // Step 3: Assert that the like count has increased (greater than 0)
    cy.getBySel("transaction-item")
      .first()
      .within(() => {
        cy.getBySel("like-count").invoke("text").then((text) => {
          const currentLikes = parseInt(text);
          expect(currentLikes).to.be.greaterThan(0);
        });
      });

    // Log success
    cy.log("Transaction liked successfully");
  });
});
