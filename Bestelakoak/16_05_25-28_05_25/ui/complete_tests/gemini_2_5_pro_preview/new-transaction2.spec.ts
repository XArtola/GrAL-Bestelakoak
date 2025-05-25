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
// Navigate to the new transaction page
cy.getBySelLike("new-transaction").click();
cy.wait("@allUsers");

// Select the contact user
cy.getBySelLike("user-list-item").contains(ctx.contact!.firstName).click();

// Enter transaction request details
cy.getBySelLike("amount-input").type(userInfo.requestTransactions[0].amount);
cy.getBySelLike("description-input").type(userInfo.requestTransactions[0].description);

// Click the request button
cy.getBySelLike("submit-request").click();

// Wait for the transaction to be created
cy.wait("@createTransaction");

// Verify the transaction appears in the personal feed
cy.getBySel("personal-tab").click();
cy.wait("@personalTransactions");
cy.getBySel("transaction-item")
.first()
.should("contain", userInfo.requestTransactions[0].description)
.and("contain", `$${userInfo.requestTransactions[0].amount}`);
//
 });
});
