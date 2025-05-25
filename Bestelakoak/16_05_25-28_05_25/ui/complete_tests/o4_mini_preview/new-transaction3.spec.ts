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
// it("displays new transaction errors")
//
// Open the new transaction form
cy.getBySelLike("new-transaction").click();
cy.wait("@allUsers");

// Select a recipient to enable the form
cy.getBySelLike("user-list-item").first().click();

// Attempt to submit a payment without entering any details
cy.getBySel("transaction-create-submit-payment").click();

// Assert that the amount and description error messages are visible
cy.getBySel("transaction-create-amount-error")
.should("be.visible")
.and("contain", "Please enter a valid amount");
cy.getBySel("transaction-create-description-error")
.should("be.visible")
.and("contain", "Please enter a note");

// If your app supports request mode, switch tabs and repeat assertions
// cy.getBySel("transaction-create-request-tab").click();
// cy.getBySel("transaction-create-submit-request").click();
// cy.getBySel("transaction-create-amount-error")
//   .should("be.visible")
//   .and("contain", "Please enter a valid amount");
// cy.getBySel("transaction-create-description-error")
//   .should("be.visible")
//   .and("contain", "Please enter a note");
 });
});
