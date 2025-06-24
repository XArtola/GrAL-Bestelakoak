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
    it('renders an empty bank account list state with onboarding modal', () => {
    // it("renders an empty bank account list state with onboarding modal", () => { });

    /*
      Test: renders an empty bank account list state with onboarding modal
      - Verifies that when the user has no bank accounts, the empty state and onboarding modal are shown.
    */
    cy.visit("/bankaccounts");

    // Wait for the bank accounts list to load and ensure it's empty
    cy.getBySel("bankaccount-list").should("exist");
    cy.getBySel("bankaccount-list-item").should("have.length", 0);

    // Assert that the onboarding modal is visible
    cy.getBySel("user-onboarding-dialog").should("be.visible");

    // Optionally, check for onboarding modal content
    cy.getBySel("user-onboarding-dialog-title").should("contain", "Get Started");

    // Close the onboarding modal if needed for further tests
    cy.getBySel("user-onboarding-next").click();
    cy.getBySel("user-onboarding-dialog").should("not.exist");
  });
});
