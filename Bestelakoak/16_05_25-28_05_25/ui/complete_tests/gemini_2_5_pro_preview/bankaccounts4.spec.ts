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
// Step 1: Navigate to the bank accounts page.
// This is typically done by clicking a navigation link.
cy.getBySel("sidenav-bankaccounts").click();

// Step 2: Wait for the API call that lists bank accounts to complete.
// This ensures the page has attempted to load data before we make assertions.
cy.wait("@gqlListBankAccountQuery");

// Step 3: Assert that the bank account list is not present.
// This assumes that if no bank accounts exist for the user, the list container itself is not rendered.
// An alternative or complementary assertion could be to check for a specific empty state message
// (e.g., cy.getBySel("empty-list-header").should("be.visible");).
cy.getBySel("bankaccount-list").should("not.exist");

// Step 4: Assert that the onboarding modal is visible.
// This assumes 'onboarding-modal' is the correct data-test selector for the modal.
// Other common selectors could be 'user-onboarding-dialog'.
cy.getBySel("onboarding-modal").should("be.visible");
//
 });
});
