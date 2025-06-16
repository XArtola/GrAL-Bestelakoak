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
    it("navigates to the new transaction form, selects a user and submits a transaction payment", () => {
// Navigate to the new transaction form

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Search for the contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the first user from the results

  cy.getBySel("user-list-item").first().click();

  // Fill out payment details using the first payment transaction

  cy.getBySel("amount-input").type("35");
  cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");

  // Submit the payment

  cy.getBySelLike("transaction-create-submit-payment").click();

  // Wait for transaction to be created

  cy.wait("@createTransaction");

  // Verify transaction was created successfully

  cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Transaction Submitted!");

  // Verify we're back on the personal transactions page

  cy.getBySel("nav-personal-tab").should("have.class", "Mui-selected");

  // Verify the transaction appears in the list

  cy.getBySel("transaction-item").first().should("contain", "Sushi dinner 🍣").and("contain", "$35");
 });
});
