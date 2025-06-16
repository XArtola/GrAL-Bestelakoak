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
// <generated_code>

  // Step 1: Seed the database to reset the state

  cy.task("db:seed");

  // Step 2: Log in with a user who has no bank accounts

  cy.database("find", "users").then((user: User) => {
    cy.loginByXstate(user.username);

    // Step 3: Navigate to the bank accounts page

    cy.getBySel("sidenav-bankaccounts").click();

    // Step 4: Verify that the bank account list is empty

    cy.getBySel("bankaccount-list").should("not.exist");

    // Step 5: Verify that the onboarding modal is displayed

    cy.getBySel("onboarding-modal").should("be.visible");
  });

  // </generated_code>
 });
});
