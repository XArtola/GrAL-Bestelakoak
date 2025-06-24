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
    it('creates a new bank account', () => {
    // Navigate to the bank accounts page
            cy.getBySel("nav-bankaccounts").click();
            cy.wait("@getNotifications");

            // Click the "Create New Bank Account" button
            cy.getBySel("bankaccount-new").click();

            // Type in the bank account details
            cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
            cy.getBySel("bankaccount-routingNumber-input").type("987654321");
            cy.getBySel("bankaccount-accountNumber-input").type("123456789");

            // Submit the form
            cy.getBySel("bankaccount-submit").click();

            // Wait for the create bank account mutation to complete
            cy.wait("@gqlCreateBankAccountMutation");

            // Assert that the new bank account is displayed in the list
            cy.contains("The Best Bank").should("be.visible");
            cy.contains("123456789").should("be.visible");
  });
});
