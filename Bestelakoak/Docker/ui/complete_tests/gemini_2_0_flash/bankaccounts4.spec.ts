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
    // Check if the bank account list is empty
            cy.getBySel("bankaccount-list").should("be.empty");

            // Check if the onboarding modal is displayed
            cy.getBySel("onboarding-modal").should("be.visible");

            // Check if the "Add Bank Account" button is displayed
            cy.getBySel("onboarding-add-bank-account").should("be.visible");
  });
});
