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
    it("should display bank account form errors", () => {
// <generated_code>

  // Click the "Create" button to open the new bank account form

  cy.getBySel("bankaccount-new").click();

  // Attempt to submit the form with no fields filled

  cy.getBySel("bankaccount-submit").click();

  // Verify that error messages are displayed for all required fields

  cy.getBySel("bankName-input-helper-text").should("be.visible").and("contain", "Enter a bank name");
  cy.getBySel("routingNumber-input-helper-text").should("be.visible").and("contain", "Enter a routing number");
  cy.getBySel("accountNumber-input-helper-text").should("be.visible").and("contain", "Enter an account number");

  // Enter an invalid routing number (too short)

  cy.getBySel("bankaccount-routingNumber-input").type("123");
  cy.getBySel("bankaccount-submit").click();
  cy.getBySel("routingNumber-input-helper-text").should("be.visible").and("contain", "Must contain a valid routing number");

  // Clear routing number and enter an invalid account number (too short)

  cy.getBySel("bankaccount-routingNumber-input").clear();
  cy.getBySel("bankaccount-accountNumber-input").type("abc");
  cy.getBySel("bankaccount-submit").click();
  cy.getBySel("accountNumber-input-helper-text").should("be.visible").and("contain", "Must contain a valid account number");

  // Fill in bank name to satisfy one requirement

  cy.getBySel("bankaccount-bankName-input").type("Test Bank");

  // Submit again to check remaining errors

  cy.getBySel("bankaccount-submit").click();

  // Bank name error should be gone

  cy.getBySel("bankName-input-helper-text").should("not.exist");

  // Routing number and account number errors should persist

  cy.getBySel("routingNumber-input-helper-text").should("be.visible").and("contain", "Enter a routing number"); // Error changes back as field is now empty

  cy.getBySel("accountNumber-input-helper-text").should("be.visible").and("contain", "Must contain a valid account number"); // Error persists for invalid input

  // </generated_code>
 });
});
