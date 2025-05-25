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
// renders an empty bank account list state with onboarding modal
it("renders an empty bank account list state with onboarding modal", () => {
// Navigate to the bank accounts page
cy.getBySel("sidenav-bankaccounts").click();

// Wait for the bank account list query to complete
cy.wait("@gqlListBankAccountQuery");

// Verify that the bank account list is empty or doesn't exist
cy.getBySel("bankaccount-list").should("not.exist");

// Verify that the onboarding modal is visible
cy.getBySel("user-onboarding-dialog").should("be.visible");

// Verify empty state message or header is displayed
cy.getBySel("empty-list-header").should("be.visible");
});
 });
});
