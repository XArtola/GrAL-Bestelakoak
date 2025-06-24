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
// Intercept the POST request for liking a transaction

  cy.intercept("POST", "/likes/*").as("postLike");

  // Find and click on a transaction to view its details

  cy.getBySel("transaction-item").first().click();

  // Wait for the transaction details to load

  cy.wait("@getTransaction");

  // Find and click on the like button

  cy.getBySel("transaction-like-button").click();

  // Wait for the like action to complete

  cy.wait("@postLike");

  // Verify the transaction has been liked - the button should now show as liked

  cy.getBySel("transaction-like-button").should("have.class", "MuiButton-containedPrimary");

  // Verify the like count has increased

  cy.getBySel("transaction-like-count").should("be.visible");
 });
});
