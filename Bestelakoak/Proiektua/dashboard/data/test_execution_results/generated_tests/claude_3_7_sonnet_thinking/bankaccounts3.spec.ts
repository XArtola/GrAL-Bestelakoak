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
cy.getBySel("sidenav-bankaccounts").click();
  cy.wait("@gqlListBankAccountQuery");

  // Check if any bank accounts exist and create one if needed

  cy.getBySel("bankaccount-list").then($list => {
    const hasAccounts = $list.find("[data-test^='bankaccount-item']").length > 0;
    if (!hasAccounts) {
      // Create a bank account first

      cy.getBySel("bankaccount-new").click();
      cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
      cy.getBySel("bankaccount-routingNumber-input").type("987654321");
      cy.getBySel("bankaccount-accountNumber-input").type("123456789");
      cy.getBySel("bankaccount-submit").click();
      cy.wait("@gqlCreateBankAccountMutation");

      // Return to the bank accounts list

      cy.getBySel("sidenav-bankaccounts").click();
      cy.wait("@gqlListBankAccountQuery");
    }

    // Store account count before deletion

    cy.getBySel("bankaccount-list").find("[data-test^='bankaccount-item']").its("length").as("initialCount");

    // Find and delete the first bank account

    cy.getBySel("bankaccount-list").find("[data-test^='bankaccount-item']").first().within(() => {
      cy.getBySel("bankaccount-delete").click();
    });

    // Wait for the delete mutation to complete

    cy.wait("@gqlDeleteBankAccountMutation");

    // Verify success notification

    cy.contains("deleted").should("be.visible");

    // Verify the account was removed from the list

    cy.get("@initialCount").then(initialCount => {
      if (initialCount === 1) {
        // If it was the only account, check for empty state

        cy.getBySel("empty-list-header").should("be.visible");
      } else {
        // Otherwise verify count decreased by 1

        cy.getBySel("bankaccount-list").find("[data-test^='bankaccount-item']").should("have.length", Number(initialCount) - 1);
      }
    });
  });
 });
});
