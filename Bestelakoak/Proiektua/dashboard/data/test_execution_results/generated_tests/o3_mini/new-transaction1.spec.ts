import Dinero from "dinero.js";
import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
type NewTransactionTestCtx = {
    allUsers?: User[];
    user?: User;
    contact?: User;
};
describe("New Transaction", function () {
    const ctx: NewTransactionTestCtx = {};
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/users*").as("allUsers");
        cy.intercept("GET", "/users/search*").as("usersSearch");
        cy.intercept("POST", "/transactions").as("createTransaction");
        cy.intercept("GET", "/notifications").as("notifications");
        cy.intercept("GET", "/transactions/public").as("publicTransactions");
        cy.intercept("GET", "/transactions").as("personalTransactions");
        cy.intercept("PATCH", "/transactions/*").as("updateTransaction");
        cy.database("filter", "users").then((users: User[]) => {
            ctx.allUsers = users;
            ctx.user = users[0];
            ctx.contact = users[1];
            return cy.loginByXstate(ctx.user.username);
        });
    });
    it('navigates to the new transaction form, selects a user and submits a transaction payment', () => {
    // it("navigates to the new transaction form, selects a user and submits a transaction payment", () => { });
        // Navigate to the new transaction form and submit a payment transaction using userInfo.paymentTransactions[0]
        const { user, contact } = ctx;
    
        // Click button to open the new transaction form
        cy.getBySel("new-transaction-button").click();
    
        // Verify that the new transaction form is visible
        cy.getBySel("new-transaction-form").should("be.visible");
    
        // Use the first payment transaction data from userInfo
        const paymentTx = userInfo.paymentTransactions[0];
    
        // Fill the transaction amount and description inputs
        cy.get('[data-test="transaction-amount"]').clear().type(paymentTx.amount);
        cy.get('[data-test="transaction-description"]').clear().type(paymentTx.description);
    
        // Assume the receiver selection is a dropdown: select the contact's username as the receiver
        // (This step might vary depending on how your UI handles receiver selection)
        cy.get('[data-test="transaction-receiver"]').select(contact.username);
    
        // Submit the new transaction
        cy.get('[data-test="submit-transaction"]').click();
    
        // Wait for the create transaction API call and assert it returned success
        cy.wait("@createTransaction").its("response.statusCode").should("eq", 200);
    
        // Verify that the new transaction appears in the transaction list
        cy.get('[data-test="transaction-item"]')
          .should("contain", paymentTx.description)
          .and("contain", paymentTx.amount);
  });
});
