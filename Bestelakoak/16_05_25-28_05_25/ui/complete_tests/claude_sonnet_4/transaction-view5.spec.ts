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
// rejects a transaction request
it("rejects a transaction request", () => {
// Verify we have a pending transaction request to work with
cy.then(() => {
expect(ctx.transactionRequest).to.exist;
expect(ctx.transactionRequest.status).to.equal("pending");
});

// Find and click on the pending transaction request in the personal feed
cy.getBySel("transaction-item")
.filter(`:contains("${ctx.transactionRequest.description}")`)
.first()
.click();

// Wait for the transaction details to load
cy.wait("@getTransaction");

// Verify we're on the transaction detail page and it shows as pending
cy.getBySel("transaction-detail-header").should("contain", "pending");

// Reject the transaction request
cy.getBySel("transaction-reject-request").click();

// Wait for the transaction update to complete
cy.wait("@updateTransaction");

// Verify the transaction status is now rejected/declined
cy.getBySel("transaction-detail-header").should("contain", "rejected");

// Verify success message or status change
cy.getBySel("alert-bar-success")
.should("be.visible")
.and("contain", "Transaction Rejected");

// Navigate back to personal transactions to verify the change
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");

// Verify the transaction now shows as rejected in the transaction list
cy.getBySel("transaction-item")
.filter(`:contains("${ctx.transactionRequest.description}")`)
.first()
.should("contain", "rejected");
});
 });
});
