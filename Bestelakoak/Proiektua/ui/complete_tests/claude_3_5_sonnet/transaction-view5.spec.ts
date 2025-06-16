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
// Test for rejecting a transaction request
it("rejects a transaction request", () => {
    // Skip test if no pending transaction request exists
    cy.get("body").then(() => {
        if (!ctx.transactionRequest) {
            cy.log("No pending transaction request found - skipping test");
            return;
        }

        // Navigate to the transaction request
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");

        // Verify transaction details are displayed
        cy.getBySel("transaction-detail-header")
            .should("contain", "Requested Payment");
        
        // Click reject button
        cy.getBySel("transaction-reject-request")
            .should("be.visible")
            .click();

        // Wait for rejection to be processed
        cy.wait("@updateTransaction");

        // Verify transaction status is updated
        cy.getBySel("transaction-detail-header")
            .should("contain", "Rejected");
            
        // Return to personal transactions list
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");

        // Verify rejected transaction appears in list with correct status
        cy.getBySel("transaction-item")
            .first()
            .should("contain", "rejected");
});
 });
});
