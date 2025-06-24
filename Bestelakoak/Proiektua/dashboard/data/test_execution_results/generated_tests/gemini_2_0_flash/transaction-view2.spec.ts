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
    // Get the first transaction item
          cy.getBySelLike("transaction-item")
            .first()
            .as("transactionItem");

          // Find the like button within the transaction item and click it
          cy.get("@transactionItem")
            .find("[data-test*=like-button]")
            .click();

          // Assert that the like button is now active (or has the expected visual change)
          // This assertion might need to be adjusted based on how the like button changes visually
          cy.get("@transactionItem")
            .find("[data-test*=like-button]")
            .should("have.class", "Mui-active"); // Example assertion, adjust as needed

          // Optionally, assert that the number of likes has increased (if the UI reflects this)
          // This requires intercepting the API call to get the updated transaction data
          // and comparing the number of likes before and after clicking the button.
  });
});
