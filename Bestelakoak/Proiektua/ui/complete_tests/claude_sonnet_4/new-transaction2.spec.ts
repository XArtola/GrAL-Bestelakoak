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
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
const requestTransaction = {
    amount: "95",
    description: "Fancy Hotel 🏨"
  };

  // Navigate to the new transaction form

  cy.getBySel("nav-top-new-transaction").click();

  // Wait for users to load

  cy.wait("@allUsers");

  // Search for the contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the contact user from the search results

  cy.getBySel("user-list-item").first().click();

  // Switch to request tab (instead of payment)

  cy.getBySel("transaction-create-submit-request").click();

  // Enter the request amount

  cy.getBySel("amount-input").type(requestTransaction.amount);

  // Enter the request description

  cy.getBySel("transaction-create-description-input").type(requestTransaction.description);

  // Submit the request

  cy.getBySel("transaction-create-submit-request").click();

  // Wait for the transaction to be created

  cy.wait("@createTransaction");

  // Verify we're redirected to the personal transactions page

  cy.getBySel("nav-personal-tab").should("be.visible");

  // Verify the request transaction appears in the transaction list

  cy.getBySel("transaction-item").first().should("contain", requestTransaction.description);
  cy.getBySel("transaction-item").first().should("contain", `$${requestTransaction.amount}`);
 });
});
