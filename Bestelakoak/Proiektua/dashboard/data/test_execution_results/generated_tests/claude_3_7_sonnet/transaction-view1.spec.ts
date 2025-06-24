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
    it("transactions navigation tabs are hidden on a transaction view page", () => {
// Get a transaction ID from the personal transaction list

  cy.getBySel("transaction-item").first().click();

  // Wait for the transaction detail to load

  cy.wait("@getTransaction");

  // Verify we're on a transaction detail page by checking the URL

  cy.url().should("include", "/transaction/");

  // Check that the navigation tabs container exists but is not visible

  cy.getBySel("nav-transaction-tabs").should("not.be.visible");

  // Alternative check: verify tabs are not in the DOM when in transaction detail view

  cy.getBySel("nav-public-tab").should("not.exist");
  cy.getBySel("nav-contacts-tab").should("not.exist");
  cy.getBySel("nav-personal-tab").should("not.exist");
 });
});
