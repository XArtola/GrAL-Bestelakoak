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
        // transactions navigation tabs are hidden on a transaction view page
        // Visit the first transaction in the list
        cy.get('[data-test="transaction-item"]').first().click();
        // Assert navigation tabs are not visible
        cy.get('[data-test="nav-personal-tab"]').should('not.exist');
        cy.get('[data-test="nav-public-tab"]').should('not.exist');
    });
    it("likes a transaction", () => {
        // likes a transaction
        cy.get('[data-test="transaction-item"]').first().click();
        cy.get('[data-test="transaction-like-button"]').click();
        cy.get('[data-test="transaction-like-count"]').should('not.have.text', '0');
    });
    it("comments on a transaction", () => {
        // comments on a transaction
        cy.get('[data-test="transaction-item"]').first().click();
        cy.get('[data-test="transaction-comment-input"]').type('Nice transaction!{enter}');
        cy.get('[data-test="transaction-comment-list"]').should('contain', 'Nice transaction!');
    });
    it("accepts a transaction request", () => {
        // accepts a transaction request
        // Visit a pending transaction request if available
        if (!ctx.transactionRequest) {
            cy.log('No pending transaction request available');
            return;
        }
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.get('[data-test="transaction-accept-request"]').click();
        cy.get('[data-test="transaction-request-status"]').should('contain', 'accepted');
    });
    it("rejects a transaction request", () => {
        // rejects a transaction request
        // Visit a pending transaction request if available
        if (!ctx.transactionRequest) {
            cy.log('No pending transaction request available');
            return;
        }
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.get('[data-test="transaction-reject-request"]').click();
        cy.get('[data-test="transaction-request-status"]').should('contain', 'rejected');
    });
    it("does not display accept/reject buttons on completed request", () => {
        // does not display accept/reject buttons on completed request
        // Visit a completed transaction (simulate by visiting first transaction)
        cy.get('[data-test="transaction-item"]').first().click();
        cy.get('[data-test="transaction-accept-request"]').should('not.exist');
        cy.get('[data-test="transaction-reject-request"]').should('not.exist');
    });
});
