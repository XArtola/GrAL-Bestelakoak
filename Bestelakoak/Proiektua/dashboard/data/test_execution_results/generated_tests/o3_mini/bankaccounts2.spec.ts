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
    it('should display bank account form errors', () => {
    // Test: should display bank account form errors
    // Step 1: Navigate to the bank account creation page
    cy.visit("/bankaccounts/new");

    // Step 2: Fill in the bank account form with invalid data
    // Using empty or clearly invalid values to trigger validation error messages
    cy.get('input[name="bankName"]').clear().type(""); // Empty bank name should be flagged
    cy.get('input[name="routingNumber"]').clear().type("abcde"); // Invalid routing number (non-numeric)
    cy.get('input[name="accountNumber"]').clear().type(""); // Empty account number should be flagged

    // Step 3: Attempt to submit the form
    cy.get('form').submit();

    // Step 4: Assert that error messages are displayed for each field
    cy.get('[data-test="bankName-error"]')
      .should("be.visible")
      .and("contain", "Bank name is required");

    cy.get('[data-test="routingNumber-error"]')
      .should("be.visible")
      .and("contain", "Routing number is invalid");

    cy.get('[data-test="accountNumber-error"]')
      .should("be.visible")
      .and("contain", "Account number is required");
  });
});
