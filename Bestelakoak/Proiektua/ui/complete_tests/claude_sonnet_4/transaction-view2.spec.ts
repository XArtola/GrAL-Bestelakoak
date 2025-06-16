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
// Verify we have a transaction request to work with

  expect(ctx.transactionRequest).to.exist;

  // Find and click on the transaction item to view details

  cy.getBySel("transaction-item").filter(`:contains("${ctx.transactionRequest.description}")`).first().click();

  // Wait for transaction details to load

  cy.wait("@getTransaction");

  // Verify we're on the transaction detail page

  cy.getBySel("transaction-detail").should("be.visible");

  // Find and click the like button

  cy.getBySel("transaction-like-button").click();

  // Verify the like was successful (button should show as liked)

  cy.getBySel("transaction-like-button").should("have.class", "liked").or("contain", "1"); // Could show like count

  // Verify the transaction shows it has been liked

  cy.getBySel("transaction-likes-count").should("be.visible").and("contain", "1");
 });
});
