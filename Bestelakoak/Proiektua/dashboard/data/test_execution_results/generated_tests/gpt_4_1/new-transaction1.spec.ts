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
    it('navigates to the new transaction form, selects a user and submits a transaction payment', () => {
    // navigates to the new transaction form, selects a user and submits a transaction payment
    cy.getBySelLike("new-transaction").click(); // Open new transaction form
    cy.wait("@allUsers");

    // Select the contact user as recipient
    cy.getBySelLike("user-list-item").contains(ctx.contact!.firstName).click();

    // Enter payment amount and description from userInfo
    cy.getBySel("amount-input").type("35");
    cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");

    // Select "Pay" option (assuming button or tab)
    cy.getBySel("transaction-create-submit-payment").click();

    // Wait for transaction to be created and assert success
    cy.wait("@createTransaction").its("response.statusCode").should("eq", 201);

    // Assert that the transaction appears in the personal transactions feed
    cy.getBySel("alert-bar-success").should("be.visible");
    cy.getBySelLike("transaction-item").should("exist").and("contain", "Sushi dinner 🍣");
  });
});
