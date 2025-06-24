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
// Navigate to bank accounts page

  cy.getBySel("sidenav-bankaccounts").click();

  // Wait for bank accounts data to load

  cy.wait("@gqlListBankAccountQuery");

  // Check if there are any bank accounts and delete them if necessary

  cy.get("body").then($body => {
    if ($body.find('[data-test="bankaccount-item"]').length > 0) {
      // Delete all existing bank accounts

      cy.getBySel("bankaccount-delete").each($el => {
        cy.wrap($el).click();
        cy.wait("@gqlDeleteBankAccountMutation");
      });

      // Refresh the page to see empty state

      cy.reload();
      cy.wait("@gqlListBankAccountQuery");
    }

    // Verify the empty state is displayed

    cy.getBySel("bankaccount-list").should("not.exist");
    cy.getBySel("empty-list-header").should("exist");

    // Verify the onboarding modal is visible

    cy.getBySel("user-onboarding-dialog").should("be.visible");
  });
 });
});
