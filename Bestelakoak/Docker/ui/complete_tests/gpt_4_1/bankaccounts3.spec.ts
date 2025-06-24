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
    it('soft deletes a bank account', () => {
    // "soft deletes a bank account"
    //
    // This test will:
    // 1. Create a new bank account for the logged-in user using the provided userInfo.
    // 2. Soft delete the created bank account.
    // 3. Assert that the deleted bank account is marked as deleted in the UI.

    const userInfo = {
      bankName: "The Best Bank",
      routingNumber: "987654321",
      accountNumber: "123456789"
    };

    // Step 1: Create a new bank account
    cy.getBySel("bankaccount-new").click();
    cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
    cy.getBySel("bankaccount-routingNumber-input").type("987654321");
    cy.getBySel("bankaccount-accountNumber-input").type("123456789");
    cy.getBySel("bankaccount-submit").click();

    // Wait for the bank account to be created and appear in the list
    cy.wait("@gqlCreateBankAccountMutation");
    cy.getBySel("bankaccount-list-item")
      .should("contain", "The Best Bank")
      .and("contain", "123456789");

    // Step 2: Soft delete the created bank account
    cy.getBySel("bankaccount-list-item")
      .contains("The Best Bank")
      .parents("[data-test=bankaccount-list-item]")
      .within(() => {
        cy.getBySel("bankaccount-delete").click();
      });

    // Wait for the delete mutation
    cy.wait("@gqlDeleteBankAccountMutation");

    // Step 3: Assert that the bank account is marked as deleted (should not be visible in the list)
    cy.getBySel("bankaccount-list-item")
      .should("not.contain", "The Best Bank");
  });
});
