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
        // submits a payment transaction
        // Select a user to pay (assume first user in list)
        cy.get('[data-test="user-list-item"]').first().click();
        // Fill in payment transaction form
        cy.get('[data-test="transaction-create-amount-input"]').type(paymentTransactions[0].amount.toString());
        cy.get('[data-test="transaction-create-description-input"]').type(paymentTransactions[0].description);
        cy.get('[data-test="transaction-create-submit-payment"]').click();
        // Assert transaction appears in list
        cy.get('[data-test="transaction-item"]').should('contain', paymentTransactions[0].description);
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // submits a request transaction
        // Select a user to request from (assume first user in list)
        cy.get('[data-test="user-list-item"]').first().click();
        // Fill in request transaction form
        cy.get('[data-test="transaction-create-amount-input"]').type(requestTransactions[0].amount.toString());
        cy.get('[data-test="transaction-create-description-input"]').type(requestTransactions[0].description);
        cy.get('[data-test="transaction-create-submit-request"]').click();
        // Assert transaction appears in list
        cy.get('[data-test="transaction-item"]').should('contain', requestTransactions[0].description);
    });
    it("displays new transaction errors", () => {
        // shows transaction form errors
        // Try submitting with empty fields
        cy.get('[data-test="transaction-create-submit-payment"]').click();
        cy.get('[data-test="transaction-create-amount-input-error"]').should('be.visible');
        cy.get('[data-test="transaction-create-description-input-error"]').should('be.visible');
        // Enter invalid amount
        cy.get('[data-test="transaction-create-amount-input"]').type('abc');
        cy.get('[data-test="transaction-create-submit-payment"]').click();
        cy.get('[data-test="transaction-create-amount-input-error"]').should('be.visible');
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => { });
    it("submits a transaction request and accepts the request for the receiver", () => { });
    context("searches for a user by attribute", function () {
        const searchAttrs: (keyof User)[] = [
            "firstName",
            "lastName",
            "username",
            "email",
            "phoneNumber",
        ];
        beforeEach(function () {
            cy.getBySelLike("new-transaction").click();
            cy.wait("@allUsers");
        });
        searchAttrs.forEach((attr: keyof User) => {
            it(attr, () => { });
        });
    });
});
