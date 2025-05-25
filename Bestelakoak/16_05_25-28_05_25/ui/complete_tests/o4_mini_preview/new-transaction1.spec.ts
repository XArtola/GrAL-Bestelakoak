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
// Open the new transaction form
cy.getBySelLike("new-transaction").click();
// Wait for the list of users to load
cy.wait("@allUsers");

// Select the first contact in the list
cy.getBySel("user-list-item").first().click();

// Enter the payment amount from userInfo
cy.getBySel("amount-input")
.clear()
.type(userInfo.paymentTransactions[0].amount);

// Enter the payment description from userInfo
cy.getBySel("description-input")
.clear()
.type(userInfo.paymentTransactions[0].description);

// Submit the payment transaction
cy.getBySelLike("submit-payment").click();

// Wait for the POST /transactions request to complete
cy.wait("@createTransaction");

// Assert that a success notification is shown
cy.getBySel("alert-bar-success")
.should("be.visible")
.and("contain", "Transaction Submitted!");
 });
});
