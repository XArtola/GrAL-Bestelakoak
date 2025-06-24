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
    it('submits a transaction request and accepts the request for the receiver', () => {
    // "submits a transaction request and accepts the request for the receiver"

    // Use the first request transaction from provided user info
    const request = userInfo.requestTransactions[0]; // e.g., { amount: "95", description: "Fancy Hotel 🏨" }

    // Step 1: Navigate to the new transaction form and select "request" type
    cy.get('[data-test="new-transaction-btn"]').click();
    cy.get('[data-test="transaction-type-request"]').click();

    // Step 2: Fill in the transaction form with the request details
    cy.get('[data-test="transaction-amount"]')
      .clear()
      .type(request.amount);
    cy.get('[data-test="transaction-description"]')
      .clear()
      .type(request.description);

    // Step 3: Select the receiver (using ctx.contact)
    // Type into the user search input to find the receiver by username
    cy.get('[data-test="user-search-input"]').type(ctx.contact.username);
    cy.wait('@usersSearch');
    // Select the intended receiver from the search results
    cy.get('[data-test="user-search-result"]')
      .contains(ctx.contact.username)
      .click();

    // Step 4: Submit the transaction request
    cy.get('[data-test="submit-transaction"]').click();
    cy.wait('@createTransaction')
      .its('response.statusCode')
      .should('eq', 200);

    // Step 5: Verify the request appears in the sender's personal transaction list
    cy.get('[data-test="transaction-item"]')
      .should('contain', request.description)
      .and('contain', 'pending');

    // Step 6: Simulate the receiver accepting the transaction request
    // Log out the sender and log in as the receiver
    cy.logout().then(() => {
      cy.loginByXstate(ctx.contact.username);
    });
    cy.wait('@personalTransactions');

    // Step 7: Locate the pending transaction request and click the "accept" button
    cy.get('[data-test="transaction-item"]')
      .contains(request.description)
      .parents('[data-test="transaction-item"]')
      .within(() => {
        cy.get('[data-test="accept-transaction"]').click();
      });
    cy.wait('@updateTransaction')
      .its('response.statusCode')
      .should('eq', 200);

    // Step 8: Assert that the transaction status is updated to "accepted"
    cy.get('[data-test="transaction-item"]')
      .contains(request.description)
      .should('contain', 'accepted');
  });
});
