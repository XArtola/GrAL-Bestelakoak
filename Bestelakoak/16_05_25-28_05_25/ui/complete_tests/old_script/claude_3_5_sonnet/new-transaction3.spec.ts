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
// Navigate to new transaction page

cy.getBySel("nav-top-new-transaction").click();



// Search for the contact user

cy.getBySel("user-list-search-input").type(ctx.contact.firstName);

cy.wait("@usersSearch");



// Select the user from the list

cy.getBySel("user-list-item").contains(ctx.contact.firstName).click();



// Try to submit without entering an amount

cy.getBySel("transaction-create-submit-payment").click();



// Verify error message is displayed

cy.getBySel("transaction-create-amount-error")

.should("be.visible")

.and("contain", "Please enter a valid amount");



// Enter invalid amount

cy.getBySel("amount-input").type("0");



// Try to submit with invalid amount

cy.getBySel("transaction-create-submit-payment").click();



// Verify error message is still displayed

cy.getBySel("transaction-create-amount-error")

.should("be.visible")

.and("contain", "Please enter a valid amount");



// Try to submit without a note/description

cy.getBySel("amount-input").clear().type("50");

cy.getBySel("transaction-create-submit-payment").click();



// Verify note error message is displayed

cy.getBySel("transaction-create-description-error")

.should("be.visible")

.and("contain", "Please enter a note");


 });
});
