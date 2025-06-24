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
    // should display bank account form errors
    // 1. Navigate to the bank accounts page.
    // 2. Click to add a new bank account.
    // 3. Attempt to submit the form with empty fields and assert validation errors.
    // 4. Fill in invalid routing/account numbers and assert validation errors.
    // 5. Fill in only some fields and assert validation errors.

    cy.visit("/bankaccounts");

    // Open the add bank account form
    cy.getBySel("bankaccount-new").click();

    // Attempt to submit with all fields empty
    cy.getBySel("bankaccount-submit").click();

    // Assert validation errors for all fields
    cy.getBySel("bankaccount-bankName-input-helper-text").should("contain", "Enter a bank name");
    cy.getBySel("bankaccount-routingNumber-input-helper-text").should("contain", "Enter a valid bank routing number");
    cy.getBySel("bankaccount-accountNumber-input-helper-text").should("contain", "Enter a valid bank account number");

    // Enter invalid routing number (too short)
    cy.getBySel("bankaccount-bankName-input").type("A");
    cy.getBySel("bankaccount-routingNumber-input").type("123");
    cy.getBySel("bankaccount-accountNumber-input").type("123");
    cy.getBySel("bankaccount-submit").click();

    cy.getBySel("bankaccount-routingNumber-input-helper-text").should("contain", "Must contain a valid routing number");
    cy.getBySel("bankaccount-accountNumber-input-helper-text").should("contain", "Must contain a valid account number");

    // Enter valid bank name, valid routing number, but leave account number empty
    cy.getBySel("bankaccount-bankName-input").clear().type("The Best Bank");
    cy.getBySel("bankaccount-routingNumber-input").clear().type("987654321");
    cy.getBySel("bankaccount-accountNumber-input").clear();
    cy.getBySel("bankaccount-submit").click();

    cy.getBySel("bankaccount-accountNumber-input-helper-text").should("contain", "Enter a valid bank account number");

    // Enter valid account number, but leave routing number empty
    cy.getBySel("bankaccount-routingNumber-input").clear();
    cy.getBySel("bankaccount-accountNumber-input").clear().type("123456789");
    cy.getBySel("bankaccount-submit").click();

    cy.getBySel("bankaccount-routingNumber-input-helper-text").should("contain", "Enter a valid bank routing number");
  });
});
