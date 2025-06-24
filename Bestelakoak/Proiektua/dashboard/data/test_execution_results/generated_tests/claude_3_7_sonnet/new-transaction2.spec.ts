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
// Navigate to the new transaction form

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Search for the contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the first user from the search results

  cy.getBySel("user-list-item").first().click();

  // Enter transaction request details using data from requestTransactions

  cy.getBySel("amount-input").type("95");
  cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");

  // Switch to request mode and submit the request

  cy.getBySel("transaction-create-submit-request").click();

  // Wait for the transaction to be created

  cy.wait("@createTransaction");

  // Verify the transaction was created successfully

  cy.getBySel("nav-personal-tab").should("be.visible");
  cy.getBySel("transaction-item").first().should("contain", "Fancy Hotel 🏨").and("contain", "$95");
 });
});
