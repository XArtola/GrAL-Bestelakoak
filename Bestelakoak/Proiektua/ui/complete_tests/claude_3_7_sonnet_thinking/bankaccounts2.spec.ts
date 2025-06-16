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
// Navigate to the bank accounts page

  cy.getBySel("sidenav-bankaccounts").click();

  // Click on the create button to open the form

  cy.getBySel("bankaccount-new").click();

  // Test 1: Submit empty form to check for required field errors

  cy.getBySel("bankaccount-submit").click();
  cy.getBySel("bankaccount-bankName-error").should("be.visible").and("contain", "Enter a bank name");
  cy.getBySel("bankaccount-routingNumber-error").should("be.visible").and("contain", "Enter a valid routing number");
  cy.getBySel("bankaccount-accountNumber-error").should("be.visible").and("contain", "Enter a valid account number");

  // Test 2: Test partial form completion (only bank name)

  cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
  cy.getBySel("bankaccount-submit").click();

  // Bank name error should disappear, but other errors remain

  cy.getBySel("bankaccount-bankName-error").should("not.exist");
  cy.getBySel("bankaccount-routingNumber-error").should("be.visible");
  cy.getBySel("bankaccount-accountNumber-error").should("be.visible");

  // Test 3: Test invalid routing number format (too short)

  cy.getBySel("bankaccount-routingNumber-input").type("12345");
  cy.getBySel("bankaccount-submit").click();
  cy.getBySel("bankaccount-routingNumber-error").should("be.visible").and("contain", "Must contain a valid routing number");

  // Test 4: Test invalid account number format (too short)

  cy.getBySel("bankaccount-routingNumber-input").clear();
  cy.getBySel("bankaccount-routingNumber-input").type("987654321");
  cy.getBySel("bankaccount-accountNumber-input").type("12345");
  cy.getBySel("bankaccount-submit").click();
  cy.getBySel("bankaccount-accountNumber-error").should("be.visible").and("contain", "Must contain a valid account number");

  // Test 5: Verify form submits successfully when all fields are filled correctly

  cy.getBySel("bankaccount-accountNumber-input").clear();
  cy.getBySel("bankaccount-accountNumber-input").type("123456789");
  cy.getBySel("bankaccount-submit").click();
  cy.wait("@gqlCreateBankAccountMutation");

  // Verify we're no longer on the form page or that success is shown

  cy.getBySel("bankaccount-list").should("be.visible");
 });
});
