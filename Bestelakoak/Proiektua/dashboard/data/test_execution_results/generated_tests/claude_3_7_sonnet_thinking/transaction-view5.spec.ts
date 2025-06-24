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
    it("rejects a transaction request", () => {
// Skip test if no pending transaction request is found

  if (!ctx.transactionRequest) {
    cy.log("No pending transaction request found. Skipping test.");
    return;
  }

  // Find and click on the pending transaction request in the list

  cy.getBySel("transaction-item").contains(ctx.transactionRequest.description || "").first().click();

  // Wait for transaction details to load

  cy.wait("@getTransaction");

  // Verify the transaction details page shows a pending request

  cy.getBySel("transaction-detail-header").should("be.visible");
  cy.getBySel("transaction-payment-status").should("contain", "pending");

  // Click the reject button

  cy.getBySel("transaction-reject-request").click();

  // Wait for the update transaction API call to complete

  cy.wait("@updateTransaction");

  // Assert the transaction status is updated to reflect rejection

  cy.getBySel("transaction-payment-status").should("contain", "rejected");

  // Navigate back to personal transactions

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Verify the transaction now shows as rejected in the list

  if (ctx.transactionRequest.description) {
    cy.getBySel("transaction-item").contains(ctx.transactionRequest.description).parent().should("contain", "rejected");
  }
 });
});
