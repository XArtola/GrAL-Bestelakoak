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
    it("likes a transaction", () => {
// Ensure a transaction is available

  if (!ctx.transactionRequest) {
    throw new Error("Test requires a transaction to exist.");
  }

  // Navigate to the transaction detail page

  cy.getBySel("transaction-item").first().click();
  cy.wait("@getTransaction");

  // Get the initial like count

  cy.getBySelLike("like-count").invoke("text").then(parseInt).then(initialLikeCount => {
    // Click the like button

    cy.getBySelLike("like-button").click();

    // Wait for the like transaction to complete

    cy.wait("@likeTransaction");

    // Verify the like count has increased by 1

    cy.getBySelLike("like-count").invoke("text").then(parseInt).should("equal", initialLikeCount + 1);

    // Verify the like button is disabled (or shows an "un-like" state if applicable)

    // This assertion might need adjustment based on actual app behavior

    cy.getBySelLike("like-button").should("be.disabled");
  });
 });
});
