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
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it('renders an empty bank account list state with onboarding modal', () => {
    // Test: renders an empty bank account list state with onboarding modal
    // Verify empty bank account list and the onboarding modal appear
    cy.get('[data-test="bank-account-list"]').should('exist');
    cy.get('[data-test="bank-account-list"]')
      .find('[data-test="bank-account-item"]')
      .should('have.length', 0);
    cy.get('[data-test="onboarding-modal"]').should('be.visible');

    // (Optional) Click a button within the onboarding modal to start creating a bank account
    cy.get('[data-test="onboarding-modal"]').within(() => {
      cy.contains('Add Bank Account').click();
    });

    // Confirm the bank account form is displayed
    cy.get('[data-test="bank-account-form"]').should('be.visible');

    // Fill in the bank account form fields using the provided userInfo.bankAccountInfo values
    cy.get('[data-test="bank-name"]').type(userInfo.bankAccountInfo.bankName);
    cy.get('[data-test="routing-number"]').type(userInfo.bankAccountInfo.routingNumber);
    cy.get('[data-test="account-number"]').type(userInfo.bankAccountInfo.accountNumber);

    // Submit the bank account creation form
    cy.get('[data-test="submit-bank-account"]').click();

    // Wait for the GraphQL mutation to create the bank account to finish
    cy.wait('@gqlCreateBankAccountMutation');

    // Verify that the new bank account now appears in the list
    cy.get('[data-test="bank-account-list"]')
      .find('[data-test="bank-account-item"]')
      .should('have.length', 1)
      .and('contain', userInfo.bankAccountInfo.bankName);
  });
});
