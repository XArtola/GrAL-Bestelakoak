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
    it("rejects a transaction request", () => {
// it("rejects a transaction request", () => { });
it("rejects a transaction request", () => {
// Check if we have a pending transaction request to work with
cy.wrap(ctx.transactionRequest).should("exist").then(() => {
// Navigate to the transaction detail view
cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
cy.wait("@getTransaction");

// Verify the transaction request status is pending before rejection
cy.getBySel("transaction-detail-header").should("be.visible");
cy.getBySel("transaction-status").should("contain", "pending");
cy.getBySel("transaction-action-button").should("have.length", 2);

// Click the reject button
cy.getBySel("transaction-reject-request").click();

// Wait for the update request to complete
cy.wait("@updateTransaction");

// Verify the transaction status is now rejected
cy.getBySel("transaction-status").should("contain", "rejected");
cy.getBySel("transaction-action-button").should("not.exist");

// Verify rejection appears in activity feed
cy.getBySel("transaction-detail-header").should("contain", "rejected");
});
});
 });
});
