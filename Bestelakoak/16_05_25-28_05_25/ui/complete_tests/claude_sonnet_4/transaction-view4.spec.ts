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
// accepts a transaction request
it("accepts a transaction request", () => {
// Verify that we have a pending transaction request in the context
cy.then(() => {
expect(ctx.transactionRequest).to.exist;
expect(ctx.transactionRequest.status).to.equal("pending");
expect(ctx.transactionRequest.requestStatus).to.equal("pending");
});

// Find and click on the pending transaction request in the personal transactions list
cy.getBySel("transaction-item")
.should("contain", ctx.transactionRequest.description)
.and("contain", "requested")
.first()
.click();

// Wait for the transaction details to load
cy.wait("@getTransaction");

// Verify we're on the transaction detail page and can see the request details
cy.getBySel("transaction-detail-header").should("be.visible");
cy.getBySel("transaction-amount").should("contain", `$${(ctx.transactionRequest.amount / 100).toFixed(2)}`);
cy.getBySel("transaction-description").should("contain", ctx.transactionRequest.description);

// Accept the transaction request
cy.getBySel("transaction-accept-request").click();

// Wait for the update request to complete
cy.wait("@updateTransaction");

// Verify the transaction status has been updated to complete
cy.getBySel("transaction-detail-header").should("contain", "complete");

// Verify success message or notification appears
cy.getBySel("alert-bar-success")
.should("be.visible")
.and("contain", "Transaction request accepted");

// Navigate back to personal transactions to verify the change
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");

// Verify the transaction no longer appears as pending but as completed
cy.getBySel("transaction-item")
.first()
.should("contain", ctx.transactionRequest.description)
.and("contain", "received")
.and("not.contain", "requested");
});
 });
});
