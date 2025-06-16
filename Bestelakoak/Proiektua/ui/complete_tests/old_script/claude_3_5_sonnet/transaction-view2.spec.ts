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
    it("likes a transaction", () => {
// Find a transaction in the personal feed

cy.getBySel("transaction-item")

.first()

.click();



// Wait for transaction details to load

cy.wait("@getTransaction");



// Get initial like count

cy.getBySel("transaction-like-count")

.invoke("text")

.then((text) => {

const initialLikeCount = parseInt(text || "0");



// Click the like button

cy.getBySel("transaction-like-button")

.click();



// Verify like count increased

cy.getBySel("transaction-like-count")

.should("have.text", `${initialLikeCount + 1}`);



// Verify like button state changed

cy.getBySel("transaction-like-button")

.should("have.class", "liked");

});


 });
});
