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
// Step 1: Navigate to the personal transactions tab

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Step 2: Locate a completed transaction request

  cy.getBySel("transaction-item").filter(':contains("Complete")').first().click();

  // Step 3: Verify that accept/reject buttons are not visible

  cy.getBySel("transaction-accept-request").should("not.exist");
  cy.getBySel("transaction-reject-request").should("not.exist");

  // Step 4: Assert that the transaction status is displayed as "Complete"

  cy.getBySel("transaction-payment-status").should("contain", "Complete");
 });
});
