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



// Search for a user by name

cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);

cy.wait("@usersSearch");



// Select the first user from the search results

cy.getBySel("user-list-item").first().click();



// Fill out the request form

cy.getBySel("amount-input").type(userInfo.requestTransactions[0].amount);

cy.getBySel("transaction-create-description-input").type(userInfo.requestTransactions[0].description);



// Submit the request

cy.getBySelLike("transaction-create-submit-request").click();



// Confirm the transaction request was created

cy.wait("@createTransaction");



// Verify the request appears in the personal transactions feed

cy.getBySel("personal-tab").should("have.class", "Mui-selected");

cy.getBySel("transaction-item").first().should("contain", userInfo.requestTransactions[0].description);

cy.getBySel("transaction-item").first().should("contain", `$${userInfo.requestTransactions[0].amount}`);
 });
});
