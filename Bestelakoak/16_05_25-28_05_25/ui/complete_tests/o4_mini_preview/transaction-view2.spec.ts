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
// 1. Open the first transaction detail
cy.getBySel("transaction-item")
.first()
.click();
cy.wait("@getTransaction");

// 2. Ensure like button and count are visible
cy.getBySel("transaction-like-button").should("be.visible");
cy.getBySel("transaction-likes-count")
.should("be.visible")
.invoke("text")
.then(text => {
const initialLikes = parseInt(text, 10);

// 3. Click the like button
cy.getBySel("transaction-like-button").click();

// 4. Wait for the update request
cy.wait("@updateTransaction");

// 5. Verify the like count has increased by 1
cy.getBySel("transaction-likes-count")
.should("contain", initialLikes + 1);
 });
});
