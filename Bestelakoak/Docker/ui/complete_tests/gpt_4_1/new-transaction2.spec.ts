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
    // navigates to the new transaction form, selects a user and submits a transaction request
    cy.getBySelLike("new-transaction").click(); // Open new transaction form
    cy.wait("@allUsers");

    // Search for the contact user by username
    cy.getBySel("user-list-search-input").type(ctx.contact!.username);
    cy.wait("@usersSearch");

    // Select the contact from the search results
    cy.getBySelLike("user-list-item").contains(ctx.contact!.firstName).click();

    // Fill in the transaction request details using userInfo.requestTransactions[0]
    cy.getBySel("transaction-create-amount-input").type("95");
    cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");

    // Select "Request" tab if not already selected
    cy.getBySel("transaction-create-request").click();

    // Submit the transaction request
    cy.getBySel("transaction-create-submit-request").click();

    // Wait for the transaction to be created
    cy.wait("@createTransaction");

    // Assert that the confirmation message appears
    cy.getBySel("alert-bar-success").should("contain", "Requested");

    // Optionally, verify that the transaction appears in the personal transactions feed
    cy.getBySel("nav-personal-tab").click();
    cy.wait("@personalTransactions");
    cy.getBySelLike("transaction-item").should("contain", "Fancy Hotel 🏨").and("contain", "$95");
  });
});
