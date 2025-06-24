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
    it('navigates to the new transaction form, selects a user and submits a transaction request', () => {
    // Test: navigates to the new transaction form, selects a user and submits a transaction request
    // 1. Open the new transaction form
    cy.get('[data-test="new-transaction"]').click();
    cy.get('[data-test="new-transaction-form"]').should("be.visible");

    // 2. Select a contact user from the available list
    // (Assumes that each user is rendered with a data-test attribute "user-select-option"
    // and that the contact's username is displayed)
    cy.get('[data-test="user-select"]').click();
    cy.get('[data-test="user-select-option"]')
      .contains(ctx.contact.username)
      .click();

    // 3. Fill out the transaction request fields using the provided userInfo.requestTransactions data
    // Using the first request transaction in the provided list
    cy.get('[data-test="transaction-amount"]')
      .clear()
      .type(userInfo.requestTransactions[0].amount.toString());
    cy.get('[data-test="transaction-description"]')
      .clear()
      .type(userInfo.requestTransactions[0].description);

    // 4. Submit the transaction request form
    cy.get('[data-test="submit-transaction"]').click();

    // 5. Wait for the transaction request call to complete and verify a positive response
    cy.wait("@createTransaction")
      .its("response.statusCode")
      .should("eq", 200);

    // 6. Assert that the newly created transaction request appears in the UI (e.g. in the personal transactions list)
    cy.get('[data-test="transaction-item"]')
      .should("contain", userInfo.requestTransactions[0].description);
  });
});
