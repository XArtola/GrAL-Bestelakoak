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
    it("navigates to the new transaction form, selects a user and submits a transaction payment", () => {
// Navigate to new transaction form
cy.getBySel("nav-top-new-transaction").click();
cy.wait("@allUsers");

// Search for the contact user
cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
cy.wait("@usersSearch");

// Select the user from the list
cy.getBySel("user-list-item").first().click();

// Enter payment amount and description
cy.getBySel("amount-input").type(paymentTransactions[0].amount);
cy.getBySel("transaction-create-description-input")
.type(paymentTransactions[0].description);

// Submit the payment
cy.getBySel("transaction-create-submit-payment").click();

// Wait for transaction creation
cy.wait("@createTransaction");

// Verify transaction success
cy.getBySel("alert-bar-success")
.should("be.visible")
.and("contain", "Transaction Submitted!");

// Verify we're redirected to the transactions list
cy.getBySel("nav-personal-tab").should("have.class", "Mui-selected");
cy.getBySel("transaction-list").should("be.visible");

// Verify the new transaction appears in the list
cy.getBySel("transaction-item")
.first()
.should("contain", paymentTransactions[0].description)
.and("contain", `$${paymentTransactions[0].amount}`);
 });
});
