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
        cy.log("No user information provided; cannot complete without further details.");
    });
    it("likes a transaction", () => {
        cy.log("More info needed to like a transaction. Additional steps required.");
    });
    it("comments on a transaction", () => {
        cy.log("More info needed to comment on a transaction. Additional steps required.");
    });
    it("accepts a transaction request", () => {
        cy.log("More info needed to accept a request. Additional steps required.");
    });
    it("rejects a transaction request", () => {
        cy.log("More info needed to reject a request. Additional steps required.");
    });
    it("does not display accept/reject buttons on completed request", () => {
        cy.log("More info needed to confirm completed request details.");
    });
});
