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
    it('rejects a transaction request', () => {
    // it("rejects a transaction request")

    // Step 1: Click the "reject" button on the transaction request view
    cy.getBySel("transaction-reject-button").click();

    // Step 2: Wait for the PATCH request to update the transaction request
    cy.wait("@updateTransaction").then((interception) => {
      // Assert that the update was successful
      expect(interception.response.statusCode).to.equal(200);
    });

    // Step 3: Assert that the UI reflects the transaction request as rejected
    cy.getBySel("transaction-status").should("contain.text", "rejected");

    // Optional: Verify in the backend (if accessible) that the transaction's requestStatus is updated
    // cy.database("find", "transactions", { id: ctx.transactionRequest.id }).then((updatedTransaction) => {
    //   expect(updatedTransaction.requestStatus).to.equal("rejected");
    // });
  });
});
