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
// Verify we have a transaction request in context

expect(ctx.transactionRequest).to.exist;



// Click on the first transaction item

cy.getBySel("transaction-item").first().click();

cy.wait("@getTransaction");



// Update transaction status to completed

cy.database("update", "transactions", {

id: ctx.transactionRequest!.id,

status: "complete",

requestStatus: "accepted",

requestResolvedAt: new Date().toISOString()

});



// Refresh the page to see updated transaction

cy.reload();

cy.wait("@getTransaction");



// Verify the accept button is not present

cy.getBySel("transaction-accept-request")

.should("not.exist");



// Verify the reject button is not present    

cy.getBySel("transaction-reject-request")

.should("not.exist");



// Verify transaction shows completed status

cy.getBySel("transaction-payment-status")

.should("contain", "Complete");


 });
});
