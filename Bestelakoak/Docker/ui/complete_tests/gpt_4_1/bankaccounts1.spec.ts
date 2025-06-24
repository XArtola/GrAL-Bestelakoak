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
    // Step 1: Navigate to the add bank account form

      cy.getBySel("bankaccount-new").click();

      // Step 2: Fill out the bank account form with provided userInfo

      cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
      cy.getBySel("bankaccount-routingNumber-input").type("987654321");
      cy.getBySel("bankaccount-accountNumber-input").type("123456789");

      // Step 3: Submit the form

      cy.getBySel("bankaccount-submit").click();

      // Step 4: Wait for the GraphQL mutation and notifications

      cy.wait("@gqlCreateBankAccountMutation");
      cy.wait("@getNotifications");

      // Step 5: Assert that the new bank account appears in the list

      cy.getBySel("bankaccount-list").should("contain", "The Best Bank");
  });
});
