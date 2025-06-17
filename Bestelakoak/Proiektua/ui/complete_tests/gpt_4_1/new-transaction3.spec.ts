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
    // "displays new transaction errors"
    //
    // This test will attempt to submit a new transaction form with invalid or missing data
    // and assert that the appropriate error messages are displayed.

    cy.getBySelLike("new-transaction").click();
    cy.wait("@allUsers");

    // Step 1: Try submitting with no user selected
    cy.getBySelLike("user-list-search-input").clear();
    cy.getBySelLike("amount-input").clear();
    cy.getBySelLike("transaction-create-submit-payment").click();
    cy.getBySel("user-list-search-input-helper-text").should("be.visible");

    // Step 2: Select a user but leave amount empty
    cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
    cy.getBySelLike("user-list-item").first().click();
    cy.getBySelLike("amount-input").clear();
    cy.getBySelLike("transaction-create-submit-payment").click();
    cy.getBySel("amount-input-helper-text").should("be.visible");

    // Step 3: Enter invalid (non-numeric) amount
    cy.getBySelLike("amount-input").type("abc");
    cy.getBySelLike("transaction-create-submit-payment").click();
    cy.getBySel("amount-input-helper-text").should("be.visible");

    // Step 4: Enter negative amount
    cy.getBySelLike("amount-input").clear().type("-50");
    cy.getBySelLike("transaction-create-submit-payment").click();
    cy.getBySel("amount-input-helper-text").should("be.visible");

    // Step 5: Enter valid amount but leave description empty
    cy.getBySelLike("amount-input").clear().type("10");
    cy.getBySelLike("transaction-create-submit-payment").click();
    cy.getBySel("description-input-helper-text").should("be.visible");

    // Step 6: Enter all valid data, then clear one field and check error
    cy.getBySelLike("description-input").type("Test payment");
    cy.getBySelLike("amount-input").clear();
    cy.getBySelLike("transaction-create-submit-payment").click();
    cy.getBySel("amount-input-helper-text").should("be.visible");
  });
});
