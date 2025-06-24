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
    it("renders an empty bank account list state with onboarding modal", () => {
// Reset the database to ensure we have a clean state

  cy.task("db:seed");

  // Find a user without bank accounts or remove bank accounts from current user

  cy.database("find", "users").then((users: User[]) => {
    // Login with the first user

    const firstUser = users[0];

    // Check if this user has bank accounts

    cy.database("find", "bankaccounts", {
      userId: firstUser.id
    }).then(bankAccounts => {
      // If user has bank accounts, delete them

      if (bankAccounts && bankAccounts.length > 0) {
        bankAccounts.forEach(account => {
          cy.database("delete", "bankaccounts", {
            id: account.id
          });
        });
      }

      // Login with the user

      cy.loginByXstate(firstUser.username);

      // Navigate to bank accounts page

      cy.getBySel("sidenav-bankaccounts").click();

      // Wait for the list bank accounts query

      cy.wait("@gqlListBankAccountQuery");

      // Verify that the bank accounts list is not visible

      cy.getBySel("bankaccount-list").should("not.exist");

      // Verify that empty state elements are displayed

      cy.getBySel("empty-list-header").should("be.visible");

      // Verify that the onboarding modal is shown

      cy.getBySel("user-onboarding-dialog").should("be.visible");
    });
  });
 });
});
