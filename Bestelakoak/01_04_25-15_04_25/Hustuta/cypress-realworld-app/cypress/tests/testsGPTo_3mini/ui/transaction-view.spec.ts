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
        // Visit a known transaction detail page and assert nav tabs are hidden
        cy.visit("/transaction/some-transaction-id");
        cy.get("[data-test=nav-personal-tab]").should("not.exist");
        cy.get("[data-test=nav-public-tab]").should("not.exist");
    });
    it("likes a transaction", () => {
        // Visit a transaction and click the like button; verify like count updates
        cy.visit("/transaction/some-transaction-id");
        cy.get("[data-test=transaction-like-button]").click();
        cy.contains("1 Like").should("be.visible");
    });
    it("comments on a transaction", () => {
        // Type a comment and submit; verify comment appears
        cy.visit("/transaction/some-transaction-id");
        cy.get("[data-test=transaction-comment-input]").type("Great transaction!");
        cy.get("[data-test=transaction-comment-submit]").click();
        cy.contains("Great transaction!").should("be.visible");
    });
    it("accepts a transaction request", () => {
        // For a pending request, click accept and check success notification
        cy.visit("/transaction/pending-request-id");
        cy.get("[data-test=transaction-accept-request]").click();
        cy.wait("@updateTransaction");
        cy.contains("Request accepted").should("be.visible");
    });
    it("rejects a transaction request", () => {
        // For a pending request, click reject and verify the request status update
        cy.visit("/transaction/pending-request-id");
        cy.get("[data-test=transaction-reject-request]").click();
        cy.wait("@updateTransaction");
        cy.contains("Request rejected").should("be.visible");
    });
    it("does not display accept/reject buttons on completed request", () => {
        // For a completed request, assert that accept and reject buttons do not exist
        cy.visit("/transaction/completed-request-id");
        cy.get("[data-test=transaction-accept-request]").should("not.exist");
        cy.get("[data-test=transaction-reject-request]").should("not.exist");
    });
});
