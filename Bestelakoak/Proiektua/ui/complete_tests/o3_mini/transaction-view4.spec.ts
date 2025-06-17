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
    it('accepts a transaction request', () => {
    // Check that a pending transaction request is available from context
        cy.wrap(ctx.transactionRequest).should('exist');

        // Simulate clicking the "Accept" button for the transaction request.
        // (Assuming there is a button with a data-test attribute "accept-transaction" inside the transaction request item)
        cy.getBySel('transaction-request')
          .find('[data-test="accept-transaction"]')
          .click();

        // Wait for the PATCH call to complete and assert a 200 OK response.
        cy.wait('@updateTransaction').its('response.statusCode').should('eq', 200);

        // Optionally, verify that the UI shows the transaction request as accepted.
        // (Assuming there is an element with a data-test attribute "transaction-request-status" that displays the status.)
        cy.getBySel('transaction-request-status')
          .should('contain.text', 'accepted');

        // You may add more assertions if additional elements should change (e.g. user's updated balance)
  });
});
