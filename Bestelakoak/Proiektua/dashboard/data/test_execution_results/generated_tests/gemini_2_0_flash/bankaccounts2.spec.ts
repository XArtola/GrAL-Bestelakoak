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
    // Navigate to the bank accounts page
            cy.visit("/bankaccounts");

            // Click the "Create Bank Account" button
            cy.getBySel("bankaccount-new").click();

            // Leave the bank name field empty and submit the form
            cy.getBySel("bankaccount-submit").click();

            // Assert that an error message is displayed for the bank name field
            cy.getBySel("bankaccount-bankName-error").should("be.visible");

            // Leave the routing number field empty and submit the form
            cy.getBySel("bankaccount-bankName").type("The Best Bank");
            cy.getBySel("bankaccount-submit").click();

            // Assert that an error message is displayed for the routing number field
            cy.getBySel("bankaccount-routingNumber-error").should("be.visible");

            // Leave the account number field empty and submit the form
            cy.getBySel("bankaccount-routingNumber").type("123");
            cy.getBySel("bankaccount-submit").click();

            // Assert that an error message is displayed for the account number field
            cy.getBySel("bankaccount-accountNumber-error").should("be.visible");

            // Enter invalid data into the routing number and account number fields
            cy.getBySel("bankaccount-routingNumber").clear().type("invalid");
            cy.getBySel("bankaccount-accountNumber").clear().type("invalid");
            cy.getBySel("bankaccount-submit").click();

            // Assert that an error message is displayed for the routing number and account number fields
            cy.getBySel("bankaccount-routingNumber-error").should("be.visible");
            cy.getBySel("bankaccount-accountNumber-error").should("be.visible");
  });
});
