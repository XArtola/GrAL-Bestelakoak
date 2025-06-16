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

  // First create a new bank account to ensure we have one to delete

  cy.getBySel("bankaccount-new").click();
  cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
  cy.getBySel("bankaccount-routingNumber-input").type("987654321");
  cy.getBySel("bankaccount-accountNumber-input").type("123456789");
  cy.getBySel("bankaccount-submit").click();
  cy.wait("@gqlCreateBankAccountMutation");

  // Verify the bank account exists in the list

  cy.getBySel("bankaccount-list").should("be.visible");
  cy.contains("The Best Bank").should("be.visible");

  // Delete the bank account

  cy.contains("The Best Bank").parent().find("[data-test=bankaccount-delete]").click();

  // Confirm deletion in the dialog

  cy.getBySel("bankaccount-delete-confirmation").click();

  // Wait for deletion request to complete

  cy.wait("@gqlDeleteBankAccountMutation");

  // Verify the bank account is no longer displayed

  cy.contains("The Best Bank").should("not.exist");
 });
});
