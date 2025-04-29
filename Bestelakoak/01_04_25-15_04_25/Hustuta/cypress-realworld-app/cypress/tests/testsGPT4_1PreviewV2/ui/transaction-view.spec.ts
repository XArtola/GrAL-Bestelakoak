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
        cy.getBySel("transaction-item").first().click();
        cy.getBySel("nav-personal-tab").should("not.exist");
        cy.getBySel("nav-public-tab").should("not.exist");
        cy.getBySel("nav-contacts-tab").should("not.exist");
    });
    it("likes a transaction", () => {
        // likes a transaction
        cy.getBySel("transaction-item").first().click();
        cy.getBySel("like-button").click();
        cy.getBySel("like-button").should("have.class", "MuiIconButton-colorPrimary");
    });
    it("comments on a transaction", () => {
        // comments on a transaction
        cy.getBySel("transaction-item").first().click();
        cy.getBySel("comment-input").type("Nice transaction!{enter}");
        cy.getBySel("comment-list").should("contain", "Nice transaction!");
    });
    it("accepts a transaction request", () => {
        // accepts a transaction request
        if (!ctx.transactionRequest) return;
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("accept-request").click();
        cy.wait("@updateTransaction");
        cy.getBySel("accept-request").should("not.exist");
        cy.getBySel("reject-request").should("not.exist");
    });
    it("rejects a transaction request", () => {
        // rejects a transaction request
        if (!ctx.transactionRequest) return;
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.getBySel("reject-request").click();
        cy.wait("@updateTransaction");
        cy.getBySel("accept-request").should("not.exist");
        cy.getBySel("reject-request").should("not.exist");
    });
    it("does not display accept/reject buttons on completed request", () => {
        // does not display accept/reject buttons on completed request
        cy.getBySel("transaction-item").first().click();
        cy.getBySel("accept-request").should("not.exist");
        cy.getBySel("reject-request").should("not.exist");
    });
});
