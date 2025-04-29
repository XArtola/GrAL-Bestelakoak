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
        // Open new transaction form
        cy.getBySelLike('new-transaction').click();
        cy.wait('@allUsers');
        // Select receiver user
        cy.get('[data-testid="user-select"]').click();
        cy.contains(ctx.contact.username).click();
        // Fill payment details
        cy.get('[data-testid="transaction-amount"]').type(`${paymentTransactions[0].amount}`);
        cy.get('[data-testid="transaction-description"]').type(paymentTransactions[0].description);
        // Submit payment
        cy.get('[data-testid="submit-payment"]').click();
        cy.wait('@createTransaction');
        // Assert transaction appears in history
        cy.contains(paymentTransactions[0].description).should('be.visible');
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // Open form
        cy.getBySelLike('new-transaction').click();
        cy.wait('@allUsers');
        // Select receiver
        cy.get('[data-testid="user-select"]').click();
        cy.contains(ctx.contact.username).click();
        // Fill request details
        cy.get('[data-testid="transaction-amount"]').type(`${requestTransactions[0].amount}`);
        cy.get('[data-testid="transaction-description"]').type(requestTransactions[0].description);
        // Submit request
        cy.get('[data-testid="submit-request"]').click();
        cy.wait('@createTransaction');
        // Assert request appears
        cy.contains(requestTransactions[0].description).should('be.visible');
    });
    it("displays new transaction errors", () => {
        // Open form without selecting user or entering details
        cy.getBySelLike('new-transaction').click();
        cy.wait('@allUsers');
        cy.get('[data-testid="submit-payment"]').click();
        // Assert validation messages
        cy.contains('Receiver is required').should('be.visible');
        cy.contains('Amount is required').should('be.visible');
        cy.contains('Description is required').should('be.visible');
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // Create second payment
        cy.getBySelLike('new-transaction').click();
        cy.wait('@allUsers');
        cy.get('[data-testid="user-select"]').click();
        cy.contains(ctx.contact.username).click();
        cy.get('[data-testid="transaction-amount"]').type(`${paymentTransactions[1].amount}`);
        cy.get('[data-testid="transaction-description"]').type(paymentTransactions[1].description);
        cy.get('[data-testid="submit-payment"]').click();
        cy.wait('@createTransaction');
        // Login as receiver and check transaction
        cy.loginByXstate(ctx.contact.username);
        cy.contains(paymentTransactions[1].description).should('be.visible');
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        // Create second request
        cy.getBySelLike('new-transaction').click();
        cy.wait('@allUsers');
        cy.get('[data-testid="user-select"]').click();
        cy.contains(ctx.contact.username).click();
        cy.get('[data-testid="transaction-amount"]').type(`${requestTransactions[1].amount}`);
        cy.get('[data-testid="transaction-description"]').type(requestTransactions[1].description);
        cy.get('[data-testid="submit-request"]').click();
        cy.wait('@createTransaction');
        // Login as receiver
        cy.loginByXstate(ctx.contact.username);
        // Accept request
        cy.contains(requestTransactions[1].description)
          .parent()
          .find('[data-testid="accept-request"]').click();
        cy.wait('@updateTransaction');
        // Assert request moved to history
        cy.contains(requestTransactions[1].description).should('be.visible');
    });
    it("displays new transaction errors", () => { });
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
            it(attr, () => {
                // Search by attribute
                cy.get('[data-testid="search-input"]').clear().type(ctx.user![attr]);
                cy.wait('@usersSearch');
                // Assert that all results match search
                cy.get('[data-testid="user-result"]').each(($el) => {
                    cy.wrap($el).contains(ctx.user![attr] as string);
                });
            });
        });
    });
});
