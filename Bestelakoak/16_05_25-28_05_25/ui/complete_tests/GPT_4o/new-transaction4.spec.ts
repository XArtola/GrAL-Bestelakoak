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
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
// Navigate to the new transaction form
cy.getBySel("new-transaction").click();
cy.wait("@allUsers");

// Search for the contact user
cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
cy.wait("@usersSearch");

// Select the first user from the search results
cy.getBySel("user-list-item").first().click();

// Enter payment amount and description
cy.getBySel("amount-input").type(userInfo.paymentTransactions[0].amount);
cy.getBySel("transaction-create-description-input").type(userInfo.paymentTransactions[0].description);

// Submit the payment
cy.getBySel("transaction-create-submit-payment").click();
cy.wait("@createTransaction");

// Verify the transaction was created successfully
cy.getBySel("transaction-success").should("contain", "Transaction submitted successfully");

// Logout and login as the receiver
cy.getBySel("sidenav-signout").click();
cy.loginByXstate(ctx.contact!.username);

// Verify the transaction appears in the receiver's transaction list
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");
cy.getBySel("transaction-item").first().should("contain", userInfo.paymentTransactions[0].description);
cy.getBySel("transaction-item").first().should("contain", `$${userInfo.paymentTransactions[0].amount}`);
 });
});
