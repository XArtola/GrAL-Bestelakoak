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
    it("displays new transaction errors", () => {
// Navigate to the new transaction form

  cy.getBySel("nav-top-new-transaction").click();
  cy.wait("@allUsers");

  // Search for the contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the user from the list

  cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();

  // Test Case 1: Submit without entering any data

  // Try to submit without entering an amount or description

  cy.getBySel("transaction-create-submit-payment").click();

  // Verify error messages are displayed for required fields

  cy.getBySel("transaction-create-amount-error").should("be.visible").should("contain", "Please enter a valid amount");
  cy.getBySel("transaction-create-description-error").should("be.visible").should("contain", "Please enter a note");

  // Test Case 2: Submit with invalid amount

  // Enter zero amount (invalid)

  cy.getBySel("amount-input").type("0");

  // Enter valid description

  cy.getBySel("transaction-create-description-input").type("Test transaction");

  // Try to submit with invalid amount

  cy.getBySel("transaction-create-submit-payment").click();

  // Verify amount error message is still displayed

  cy.getBySel("transaction-create-amount-error").should("be.visible");

  // Test Case 3: Submit with negative amount

  // Clear previous amount and enter negative amount

  cy.getBySel("amount-input").clear().type("-5");

  // Try to submit with negative amount

  cy.getBySel("transaction-create-submit-payment").click();

  // Verify amount error message is displayed

  cy.getBySel("transaction-create-amount-error").should("be.visible");

  // Test Case 4: Clear description and try to submit

  // Enter valid amount

  cy.getBySel("amount-input").clear().type("10");

  // Clear description

  cy.getBySel("transaction-create-description-input").clear();

  // Try to submit without description

  cy.getBySel("transaction-create-submit-payment").click();

  // Verify description error message is displayed

  cy.getBySel("transaction-create-description-error").should("be.visible");
 });
});
