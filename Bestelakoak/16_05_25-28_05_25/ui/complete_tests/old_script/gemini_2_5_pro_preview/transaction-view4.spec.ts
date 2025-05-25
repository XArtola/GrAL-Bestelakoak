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
    it("accepts a transaction request", () => {
// Ensure a transaction request exists

if (!ctx.transactionRequest) {

throw new Error("Test setup failed: No transaction request found for the user.");

}



// Find the transaction request in the list and click on it

// We need a reliable way to select the specific transaction.

// Assuming the description or amount can be used, or it's the first one.

// For this example, let's assume it's identifiable by its ID if possible,

// or by a combination of amount and description if those are unique enough.

// Since we have ctx.transactionRequest, we can use its properties.

cy.contains("[data-test^=transaction-item]", ctx.transactionRequest.description)

.should("be.visible")

.click();



// Wait for the transaction detail to load

cy.wait("@getTransaction");



// Click the accept button

cy.getBySel("transaction-accept-request").click();



// Wait for the update transaction call

cy.wait("@updateTransaction");



// Verify the transaction status is updated to complete or paid

// The exact text might vary based on the application's UI

cy.getBySel("transaction-detail-header") // Or a more specific selector for status

.should("contain", "complete", { matchCase: false }); // Or "paid" or similar



// Optionally, verify a success notification

cy.get(".MuiAlert-message").should("contain", "Transaction accepted"); // Adjust selector and text as needed
 });
});
