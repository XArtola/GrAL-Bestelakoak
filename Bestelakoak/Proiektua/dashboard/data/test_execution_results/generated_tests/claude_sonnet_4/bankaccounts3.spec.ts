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
    it("soft deletes a bank account", () => {
// Navigate to bank accounts page

  cy.getBySel("sidenav-bankaccounts").click();
  cy.wait("@gqlListBankAccountQuery");

  // First, create a bank account to delete

  cy.getBySel("bankaccount-new").click();
  cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
  cy.getBySel("bankaccount-routingNumber-input").type("987654321");
  cy.getBySel("bankaccount-accountNumber-input").type("123456789");
  cy.getBySel("bankaccount-submit").click();
  cy.wait("@gqlCreateBankAccountMutation");

  // Verify the bank account appears in the list

  cy.getBySel("bankaccount-list").should("contain", "The Best Bank");

  // Find and click the delete button for the bank account

  cy.getBySel("bankaccount-delete").first().click();

  // Wait for the delete mutation to complete

  cy.wait("@gqlDeleteBankAccountMutation");

  // Verify the bank account is no longer visible in the list

  cy.getBySel("bankaccount-list").should("not.contain", "The Best Bank");
 });
});
