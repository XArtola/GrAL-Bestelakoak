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
    it('displays new transaction errors', () => {
    // Test: displays new transaction errors
    // 1. Navigate to the new transaction page
    cy.visit("/new-transaction");

    // 2. Attempt to submit the form with invalid data:
    //    - Enter an invalid (non-numeric) amount
    //    - Leave the description empty
    cy.get('[data-test="transaction-amount"]').clear().type("abc");
    cy.get('[data-test="transaction-description"]').clear();

    // 3. Submit the form
    cy.get('[data-test="transaction-submit"]').click();

    // 4. Verify that appropriate error messages are shown
    cy.get('[data-test="transaction-amount-error"]')
      .should("be.visible")
      .and("contain", "Amount must be a number");

    cy.get('[data-test="transaction-description-error"]')
      .should("be.visible")
      .and("contain", "Description is required");
  });
});
