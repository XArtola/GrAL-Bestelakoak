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
        // Verify that navigation tabs are hidden on the transaction view page
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("nav-tabs").should("not.exist");
    });

    it("likes a transaction", () => {
        // Like a transaction and verify the like count increases
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("like-button").click();
        cy.getBySel("like-count").should("contain", "1");
    });

    it("comments on a transaction", () => {
        // Add a comment to a transaction and verify it appears
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("comment-input").type("Great transaction!");
        cy.getBySel("submit-comment").click();
        cy.getBySel("comment-list").should("contain", "Great transaction!");
    });

    it("accepts a transaction request", () => {
        // Accept a transaction request and verify the status changes
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("accept-request").click();
        cy.contains("Request accepted successfully").should("be.visible");
    });

    it("rejects a transaction request", () => {
        // Reject a transaction request and verify the status changes
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("reject-request").click();
        cy.contains("Request rejected successfully").should("be.visible");
    });

    it("does not display accept/reject buttons on completed request", () => {
        // Verify that accept/reject buttons are not displayed for completed requests
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("accept-request").should("not.exist");
        cy.getBySel("reject-request").should("not.exist");
    });
});
