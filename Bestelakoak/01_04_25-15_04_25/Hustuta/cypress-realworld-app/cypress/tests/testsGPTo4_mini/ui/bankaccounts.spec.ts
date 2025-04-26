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
        // Visit bank accounts page
        cy.visit('/bank-accounts');
        // Click add account
        cy.get('button[aria-label="Add Bank Account"]').click();
        // Fill form
        cy.get('input[name="bankName"]').type(bankAccountInfo.bankName);
        cy.get('input[name="routingNumber"]').type(bankAccountInfo.routingNumber);
        cy.get('input[name="accountNumber"]').type(bankAccountInfo.accountNumber);
        // Submit form
        cy.get('button[type="submit"]').click();
        // Wait for mutation
        cy.wait('@gqlCreateBankAccountMutation');
        // Assert new account in list
        cy.contains(bankAccountInfo.bankName).should('be.visible');
        cy.contains(bankAccountInfo.accountNumber).should('be.visible');
    });
    it("should display bank account form errors", () => {
        // Visit page and open form
        cy.visit('/bank-accounts');
        cy.get('button[aria-label="Add Bank Account"]').click();
        // Submit empty form
        cy.get('button[type="submit"]').click();
        // Assert validation messages
        cy.contains('Bank name is required').should('be.visible');
        cy.contains('Routing number is required').should('be.visible');
        cy.contains('Account number is required').should('be.visible');
    });
    it("soft deletes a bank account", () => {
        // Visit page
        cy.visit('/bank-accounts');
        // Delete first account
        cy.get('button[aria-label="Delete"]')
            .first()
            .click();
        // Confirm deletion
        cy.get('button[aria-label="Confirm Delete"]').click();
        // Wait for mutation
        cy.wait('@gqlDeleteBankAccountMutation');
        // Assert account removed
        cy.contains(bankAccountInfo.accountNumber).should('not.exist');
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // Visit page
        cy.visit('/bank-accounts');
        // Assert onboarding modal visible
        cy.get('[data-testid="onboarding-modal"]').should('be.visible');
    });
});
