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
    it('creates a new bank account', () => {
    // Test: creates a new bank account

    // Step 1: Navigate to the bank accounts page
    cy.visit("/bankaccounts");

    // Step 2: Click the button to open the new bank account form
    cy.get('[data-test="new-bank-account"]').click();

    // Step 3: Fill in the bank account form using provided user information
    cy.get('[data-test="bank-name"]').type(userInfo.bankAccountInfo.bankName);
    cy.get('[data-test="routing-number"]').type(userInfo.bankAccountInfo.routingNumber);
    cy.get('[data-test="account-number"]').type(userInfo.bankAccountInfo.accountNumber);

    // Step 4: Submit the form
    cy.get('[data-test="submit-bank-account"]').click();

    // Step 5: Wait for the GraphQL mutation intercept alias for account creation
    cy.wait("@gqlCreateBankAccountMutation").its("response.statusCode").should("eq", 200);

    // Step 6: Assert that the newly created bank account is displayed in the list
    cy.get('[data-test="bank-account-item"]').should("contain", userInfo.bankAccountInfo.bankName);
  });
});
