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
// Step 1: Navigate to the transaction request

cy.getBySel("transaction-item")

.contains(ctx.transactionRequest!.description)

.click();



// Step 2: Wait for the transaction details to load

cy.wait("@getTransaction");



// Step 3: Reject the transaction request

cy.getBySel("transaction-reject-request").click();



// Step 4: Wait for the transaction update to complete

cy.wait("@updateTransaction");



// Step 5: Verify the transaction status is updated to "rejected"

cy.getBySel("transaction-payment-status").should("contain", "Rejected");



// Step 6: Verify the transaction no longer appears in the pending list

cy.getBySel("nav-personal-tab").click();

cy.wait("@personalTransactions");

cy.getBySel("transaction-item")

.should("not.contain", ctx.transactionRequest!.description);
 });
});
