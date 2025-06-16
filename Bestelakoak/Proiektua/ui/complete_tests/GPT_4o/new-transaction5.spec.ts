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
    it("submits a transaction request and accepts the request for the receiver", () => {
// Navigate to the new transaction form

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Search for the contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the first user from the search results

  cy.getBySel("user-list-item").first().click();

  // Fill out the request form

  cy.getBySel("amount-input").type(userInfo.requestTransactions[0].amount);
  cy.getBySel("transaction-create-description-input").type(userInfo.requestTransactions[0].description);

  // Submit the transaction request

  cy.getBySel("transaction-create-submit-request").click();
  cy.wait("@createTransaction");

  // Log out and log in as the receiver

  cy.getBySel("sidenav-signout").click();
  cy.loginByXstate(ctx.contact!.username);

  // Navigate to personal transactions

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Find and click on the transaction request

  cy.getBySel("transaction-item").first().should("contain", userInfo.requestTransactions[0].description).click();

  // Accept the transaction request

  cy.getBySel("transaction-accept-request").click();
  cy.wait("@updateTransaction");

  // Verify the transaction status is updated

  cy.getBySel("transaction-item").first().should("contain", "accepted");
 });
});
