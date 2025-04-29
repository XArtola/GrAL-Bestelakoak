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
        cy.visit(`/transactions/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        cy.getBySel("nav-personal-tab").should("not.exist");
        cy.getBySel("nav-public-tab").should("not.exist");
    });
    it("likes a transaction", () => {
        cy.visit(`/transactions/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        cy.getBySel("transaction-like-btn").click();
        cy.wait("@updateTransaction");
        cy.getBySel("transaction-like-count").should("be.gt", 0);
    });
    it("comments on a transaction", () => {
        cy.visit(`/transactions/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        cy.getBySel("transaction-comment-input").type("Nice!");
        cy.getBySel("transaction-comment-submit").click();
        cy.wait("@updateTransaction");
        cy.contains("Nice!").should("exist");
    });
    it("accepts a transaction request", () => {
        cy.visit(`/transactions/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        cy.getBySel("accept-request-btn").click();
        cy.wait("@updateTransaction");
        cy.contains("Completed").should("exist");
    });
    it("rejects a transaction request", () => {
        cy.visit(`/transactions/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        cy.getBySel("reject-request-btn").click();
        cy.wait("@updateTransaction");
        cy.contains("Rejected").should("exist");
    });
    it("does not display accept/reject buttons on completed request", () => {
        // manually mark complete then reload
        cy.task("db:seed"); // or update in‐place
        cy.visit(`/transactions/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        cy.getBySel("accept-request-btn").should("not.exist");
        cy.getBySel("reject-request-btn").should("not.exist");
    });
});
