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
    it('transactions navigation tabs are hidden on a transaction view page', () => {
    // Click on the first transaction item to navigate to its details view  
        cy.getBySel("transaction-item").first().click();

        // Wait for the transaction details to load  
        cy.wait("@getTransaction");

        // Assert that the transaction detail container is visible (indicating we’re in the view)  
        cy.getBySel("transaction-detail").should("be.visible");

        // Assert that the navigation tabs container does not exist on the transaction view page  
        cy.getBySel("transaction-nav-tabs").should("not.exist");

        // Optionally, verify that other navigation elements (if any exist normally) are not visible  
        cy.get("nav").within(() => {
            cy.contains("Transactions").should("not.exist");
            cy.contains("Home").should("not.exist");
        });
  });
});
