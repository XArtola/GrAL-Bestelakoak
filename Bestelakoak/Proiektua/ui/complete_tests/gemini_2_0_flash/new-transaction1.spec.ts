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
    // Click on the new transaction link
          cy.getBySelLike("new-transaction").click();

          // Wait for the users to load
          cy.wait("@allUsers");

          // Type in the username of the contact
          cy.getBySelLike("user-list-search-input").type(ctx.contact.username);

          // Select the contact from the list
          cy.getBySelLike("user-list-item").first().click();

          // Enter the amount for the transaction
          cy.getBySelLike("amount-input").type("35");

          // Enter the description for the transaction
          cy.getBySelLike("description-input").type("Sushi dinner 🍣");

          // Click on the send payment button
          cy.getBySelLike("payment-submit-button").click();

          // Wait for the transaction to be created
          cy.wait("@createTransaction");

          // Assert that the transaction was created successfully
          cy.contains("Sushi dinner 🍣").should("be.visible");
  });
});
