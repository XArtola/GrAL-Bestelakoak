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
// it("displays new transaction errors", () => { });
<generated_code>
    it("displays new transaction errors", () => {
        // Navigate to the new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");

        // Select a user from the list
        cy.getBySelLike("user-list-item").first().click();

        // Attempt to submit the form without entering any details
        cy.getBySelLike("submit-payment").click();

        // Verify error messages for missing amount and description
        cy.get(".MuiFormHelperText-root")
            .should("contain", "Please enter a valid amount")
            .and("contain", "Please enter a note");

        // Enter an invalid amount (e.g., 0) and leave the description empty
        cy.getBySelLike("amount-input").type("0");
        cy.getBySelLike("submit-payment").click();

        // Verify error messages for invalid amount and missing description
        cy.get(".MuiFormHelperText-root")
            .should("contain", "Please enter a valid amount")
            .and("contain", "Please enter a note");
    });
</generated_code>
 });
});
