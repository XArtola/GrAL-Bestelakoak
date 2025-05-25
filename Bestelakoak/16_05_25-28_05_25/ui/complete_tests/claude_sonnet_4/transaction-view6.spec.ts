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
// does not display accept/reject buttons on completed request
it("does not display accept/reject buttons on completed request", () => {
// Find a completed transaction in the personal transactions list
cy.getBySel("transaction-item")
.should("be.visible")
.first()
.click();

// Wait for transaction details to load
cy.wait("@getTransaction");

// Verify that the transaction view is displayed
cy.getBySel("transaction-detail-header").should("be.visible");

// Check that accept/reject buttons are not present for completed transactions
cy.getBySel("transaction-accept-request").should("not.exist");
cy.getBySel("transaction-reject-request").should("not.exist");

// Verify that the transaction status shows as complete or settled
cy.getBySel("transaction-status")
.should("be.visible")
.and("not.contain", "pending");
});
 });
});
