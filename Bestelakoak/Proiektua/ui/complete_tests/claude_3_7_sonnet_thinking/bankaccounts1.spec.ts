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
    it("creates a new bank account", () => {
// Navigate to the bank accounts page

  cy.getBySel("sidenav-bankaccounts").click();

  // Click on the create new bank account button

  cy.getBySel("bankaccount-new").click();

  // Fill out the bank account form with the provided information

  cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
  cy.getBySel("bankaccount-routingNumber-input").type("987654321");
  cy.getBySel("bankaccount-accountNumber-input").type("123456789");

  // Submit the form

  cy.getBySel("bankaccount-submit").click();

  // Wait for the GraphQL mutation to complete

  cy.wait("@gqlCreateBankAccountMutation");

  // Verify the new bank account was created and appears in the list

  cy.getBySel("bankaccount-list").should("be.visible");
  cy.contains("The Best Bank").should("be.visible");
  cy.contains(`Account Number: ${"123456789"}`).should("be.visible");
 });
});
