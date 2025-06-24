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
    it("transactions navigation tabs are hidden on a transaction view page", () => {
// Verify we have a transaction to work with

  expect(ctx.transactionRequest, "Transaction request exists").to.not.be.undefined;

  // Navigate to specific transaction page using the transaction request ID

  cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
  cy.wait("@getTransaction");

  // Verify the transaction detail view is loaded

  cy.getBySel("transaction-detail-header").should("be.visible");

  // Verify that the navigation tabs are hidden

  cy.getBySel("nav-transaction-tabs").should("not.exist");
  cy.getBySel("nav-public-tab").should("not.exist");
  cy.getBySel("nav-contacts-tab").should("not.exist");
  cy.getBySel("nav-personal-tab").should("not.exist");

  // Verify we're still showing the transaction details

  cy.getBySel("transaction-amount").should("be.visible");
  cy.getBySel("transaction-description").should("be.visible");
 });
});
