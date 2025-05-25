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
// Navigate to the new transaction page

cy.getBySelLike("new-transaction").click();

cy.wait("@allUsers");



// Select a user

cy.getBySelLike("user-list-item").first().click();



// Try to submit without entering an amount or description

cy.getBySel("transaction-create-submit-payment").click();



// Verify error messages for amount and description are displayed

cy.getBySel("transaction-create-amount-input-helper-text").should("be.visible").and("contain", "Please enter a valid amount");

cy.getBySel("transaction-create-description-input-helper-text").should("be.visible").and("contain", "Please enter a note");



// Enter an invalid amount (e.g., 0)

cy.getBySel("transaction-create-amount-input").type("0");

cy.getBySel("transaction-create-submit-payment").click();

cy.getBySel("transaction-create-amount-input-helper-text").should("be.visible").and("contain", "Please enter a valid amount");



// Clear amount and enter a valid amount

cy.getBySel("transaction-create-amount-input").clear().type("50");

cy.getBySel("transaction-create-amount-input-helper-text").should("not.exist");





// Submit without description (amount is valid now)

cy.getBySel("transaction-create-submit-payment").click();

cy.getBySel("transaction-create-description-input-helper-text").should("be.visible").and("contain", "Please enter a note");



// Enter a description

cy.getBySel("transaction-create-description-input").type("Test description");

cy.getBySel("transaction-create-description-input-helper-text").should("not.exist");
 });
});
