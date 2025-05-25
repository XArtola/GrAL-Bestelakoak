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
// it("rejects a transaction request", () => {
````typescript
// ...existing code...
it("rejects a transaction request", () => {
// Ensure a transaction request exists
if (!ctx.transactionRequest) {
throw new Error("Test setup failed: ctx.transactionRequest is undefined");
}

// Click on the transaction request to open details
cy.contains(ctx.transactionRequest.description).click({ force: true }); // Use force if element is covered or animated

// Wait for the transaction details to load
cy.wait("@getTransaction");

// Click the reject button
cy.getBySel("transaction-reject-request").click();

// Wait for the transaction to be updated
cy.wait("@updateTransaction");

// Assert the transaction is marked as rejected
// This assertion might need to be adjusted based on how "rejected" status is displayed
// For example, it might be text on the page, or the item might disappear from a "pending" list
// and appear in a "completed" or "archived" list with a "rejected" status.
// Assuming the detail view updates to show "rejected"
cy.getBySel("transaction-status").should("contain", "rejected");

// Go back to personal feed to verify it's not in the active list or shows as rejected
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");

// Check if the transaction item now reflects the rejected status or is removed
// This depends on the application's behavior for rejected requests.
// Option 1: The item still exists and shows a rejected status
cy.contains(ctx.transactionRequest.description)
.closest("[data-test^=transaction-item]")
.should("contain", "rejected"); // Adjust selector and text as needed

// Option 2: The item is removed from the main list of active/pending requests
// cy.contains(ctx.transactionRequest.description).should('not.exist');
});
// ...existing code...
````
 });
});
