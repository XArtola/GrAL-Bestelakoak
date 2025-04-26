import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
type BankAccountsTestCtx = {
    user?: User;
};
describe("Bank Accounts", function () {
    const ctx: BankAccountsTestCtx = {};
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/notifications").as("getNotifications");
        cy.intercept("POST", apiGraphQL, (req) => {
            const operationAliases: Record<string, string> = {
                ListBankAccount: "gqlListBankAccountQuery",
                CreateBankAccount: "gqlCreateBankAccountMutation",
                DeleteBankAccount: "gqlDeleteBankAccountMutation",
            };
            const { body } = req;
            const operationName = body?.operationName;
            if (body.hasOwnProperty("operationName") &&
                operationName &&
                operationAliases[operationName]) {
                req.alias = operationAliases[operationName];
            }
        });
        cy.database("find", "users").then((user: User) => {
            ctx.user = user;
            return cy.loginByXstate(ctx.user.username);
        });
    });
    it("creates a new bank account", () => {
        // creates a new bank account
        // Open create bank account form
        cy.get('[data-test="bankaccount-new"]').click();
        // Fill in the form with valid bank account info
        cy.get('[data-test="bankaccount-bankName-input"]').type(bankAccountInfo.bankName);
        cy.get('[data-test="bankaccount-routingNumber-input"]').type(bankAccountInfo.routingNumber);
        cy.get('[data-test="bankaccount-accountNumber-input"]').type(bankAccountInfo.accountNumber);
        // Submit the form
        cy.get('[data-test="bankaccount-submit"]').click();
        // Assert the new bank account appears in the list
        cy.get('[data-test="bankaccount-list"]').should('contain', bankAccountInfo.bankName);
    });
    it("should display bank account form errors", () => {
        // should display bank account form errors
        // Open create bank account form
        cy.get('[data-test="bankaccount-new"]').click();
        // Try submitting with empty fields
        cy.get('[data-test="bankaccount-submit"]').click();
        cy.get('[data-test="bankaccount-bankName-input-error"]').should('be.visible');
        cy.get('[data-test="bankaccount-routingNumber-input-error"]').should('be.visible');
        cy.get('[data-test="bankaccount-accountNumber-input-error"]').should('be.visible');
        // Enter invalid routing and account numbers
        cy.get('[data-test="bankaccount-bankName-input"]').type('A');
        cy.get('[data-test="bankaccount-routingNumber-input"]').type('1');
        cy.get('[data-test="bankaccount-accountNumber-input"]').type('2');
        cy.get('[data-test="bankaccount-submit"]').click();
        cy.get('[data-test="bankaccount-routingNumber-input-error"]').should('be.visible');
        cy.get('[data-test="bankaccount-accountNumber-input-error"]').should('be.visible');
    });
    it("soft deletes a bank account", () => {
        // soft deletes a bank account
        // Assumes at least one bank account exists
        cy.get('[data-test="bankaccount-list"] [data-test^="bankaccount-list-item-"]').first().within(() => {
            cy.get('[data-test="bankaccount-delete"]').click();
        });
        // Confirm deletion
        cy.get('[data-test="bankaccount-list"] [data-test^="bankaccount-list-item-"]').first().should('have.attr', 'data-test-deleted', 'true');
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // renders an empty bank account list state with onboarding modal
        // Delete all bank accounts
        cy.get('[data-test="bankaccount-list"] [data-test^="bankaccount-list-item-"]').each(($el) => {
            cy.wrap($el).within(() => {
                cy.get('[data-test="bankaccount-delete"]').click();
            });
        });
        // Should show onboarding modal
        cy.get('[data-test="user-onboarding-dialog-title"]').should('be.visible');
    });
});
