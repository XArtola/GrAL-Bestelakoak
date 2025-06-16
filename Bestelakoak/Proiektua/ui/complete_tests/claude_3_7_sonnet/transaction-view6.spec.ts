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
    it("does not display accept/reject buttons on completed request", () => {
// Find a completed transaction in the personal transactions list

  cy.database("create", "transactions", {
    receiverId: ctx.authenticatedUser?.id,
    senderId: ctx.authenticatedUser?.id !== "t45AiwidW" ? "t45AiwidW" : "qywYp6hS0U",
    // Use a different user ID

    status: "complete",
    requestStatus: "approved",
    requestResolvedAt: new Date().toISOString(),
    description: "Completed transaction request",
    amount: 50,
    transactionType: "request"
  }).then(completedTransaction => {
    // Navigate to the personal transactions page

    cy.getBySel("nav-personal-tab").click();
    cy.wait("@personalTransactions");

    // Find and click on the completed transaction

    cy.getBySel("transaction-item").contains(completedTransaction.description).click();

    // Wait for transaction details to load

    cy.wait("@getTransaction");

    // Verify we're viewing the correct transaction

    cy.getBySel("transaction-detail-header").should("contain", completedTransaction.description);

    // Verify the transaction status is complete

    cy.getBySel("transaction-status").should("contain", "complete");

    // Verify accept button is not present

    cy.getBySel("transaction-accept-request").should("not.exist");

    // Verify reject button is not present

    cy.getBySel("transaction-reject-request").should("not.exist");
  });
 });
});
