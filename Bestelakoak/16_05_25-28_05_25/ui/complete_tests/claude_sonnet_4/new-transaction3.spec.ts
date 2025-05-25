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
// displays new transaction errors
it("displays new transaction errors", () => {
// Navigate to the new transaction form
cy.getBySel("nav-top-new-transaction").click();
cy.wait("@allUsers");

// Select a user from the list
cy.getBySel("user-list-item").first().click();

// Try to submit without entering amount or description
cy.getBySel("transaction-create-submit-payment").click();

// Verify error messages are displayed for required fields
cy.getBySel("transaction-create-amount-input").should("have.attr", "aria-invalid", "true");
cy.getBySel("transaction-create-description-input").should("have.attr", "aria-invalid", "true");

// Enter invalid amount (0 or negative)
cy.getBySel("transaction-create-amount-input").type("0");
cy.getBySel("transaction-create-submit-payment").click();

// Verify amount error is still displayed
cy.getBySel("transaction-create-amount-input").should("have.attr", "aria-invalid", "true");

// Clear and enter negative amount
cy.getBySel("transaction-create-amount-input").clear().type("-10");
cy.getBySel("transaction-create-submit-payment").click();

// Verify amount error is still displayed
cy.getBySel("transaction-create-amount-input").should("have.attr", "aria-invalid", "true");

// Enter valid amount but leave description empty
cy.getBySel("transaction-create-amount-input").clear().type("25");
cy.getBySel("transaction-create-submit-payment").click();

// Verify description error is displayed
cy.getBySel("transaction-create-description-input").should("have.attr", "aria-invalid", "true");

// Fill in description and verify form can be submitted successfully
cy.getBySel("transaction-create-description-input").type("Test transaction");
cy.getBySel("transaction-create-submit-payment").click();

// Wait for successful transaction creation
cy.wait("@createTransaction");

// Verify we're redirected to transactions page or success state
cy.url().should("not.include", "/transaction/new");
});
 });
});
