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
    it('transactions navigation tabs are hidden on a transaction view page', () => {
    // transactions navigation tabs are hidden on a transaction view page
    // 1. Visit a transaction detail page.
    // 2. Assert that the navigation tabs are not visible.

    cy.wrap(ctx.transactionRequest).should("exist");

    // Visit the transaction detail page for the pending request
    cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
    cy.wait("@getTransaction");

    // Assert that the navigation tabs are not visible on the transaction view page
    cy.getBySel("nav-personal-tab").should("not.exist");
    cy.getBySel("nav-contacts-tab").should("not.exist");
    cy.getBySel("nav-public-tab").should("not.exist");
  });
});
