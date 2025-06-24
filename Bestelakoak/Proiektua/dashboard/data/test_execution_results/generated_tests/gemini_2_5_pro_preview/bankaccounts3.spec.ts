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
const { bankName, routingNumber, accountNumber } = userInfo.bankAccountInfo;

    // 1. Navigate to the Bank Accounts page
    cy.visit("/bankaccounts");
    cy.wait("@gqlListBankAccountQuery"); // Wait for initial list to load

    // 2. Click the 'Create' button to add a new bank account
    // This ensures a bank account with known details exists for this test
    cy.getBySel("bankaccount-new").click();

    // 3. Fill in the bank account form
    cy.getBySel("bankaccount-bankName-input").type(bankName);
    cy.getBySel("bankaccount-routingNumber-input").type(routingNumber);
    cy.getBySel("bankaccount-accountNumber-input").type(accountNumber);
    cy.getBySel("bankaccount-submit").click();

    // 4. Wait for the creation mutation and verify the bank account is listed
    cy.wait("@gqlCreateBankAccountMutation").its("response.statusCode").should("eq", 200);
    cy.getBySel("bankaccount-list").should("contain", bankName);

    // 5. Find the specific bank account item and click its delete button
    // This assumes bank account items are 'li' elements within the 'bankaccount-list'
    // and the delete button can be found using a selector like '[data-test*=delete]' within that item.
    cy.getBySel("bankaccount-list")
      .contains("li", bankName) // Find the list item containing the bank name
      .within(() => {
        cy.get("[data-test*=delete]").click(); // Click the delete button within this item
      });

    // 6. Wait for the delete mutation
    cy.wait("@gqlDeleteBankAccountMutation").its("response.statusCode").should("eq", 200);

    // 7. Verify the bank account is no longer in the list
    cy.getBySel("bankaccount-list").should("not.contain", bankName);
 });
});
