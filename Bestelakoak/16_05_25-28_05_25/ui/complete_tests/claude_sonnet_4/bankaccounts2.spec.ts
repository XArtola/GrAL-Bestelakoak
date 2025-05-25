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
    it("should display bank account form errors", () => {
// should display bank account form errors
it("should display bank account form errors", () => {
// Navigate to bank accounts page
cy.getBySel("sidenav-bankaccounts").click();

// Click on the "Create" button to open the bank account form
cy.getBySel("bankaccount-new").click();

// Try to submit the form without filling any fields to trigger validation errors
cy.getBySel("bankaccount-submit").click();

// Assert that error messages are displayed for required fields
cy.getBySel("bankaccount-bankName-input-helper-text")
.should("be.visible")
.and("contain", "Enter a bank name");

cy.getBySel("bankaccount-routingNumber-input-helper-text")
.should("be.visible")
.and("contain", "Enter a valid bank routing number");

cy.getBySel("bankaccount-accountNumber-input-helper-text")
.should("be.visible")
.and("contain", "Enter a valid bank account number");

// Test invalid routing number format
cy.getBySel("bankaccount-bankName-input").type("Test Bank");
cy.getBySel("bankaccount-routingNumber-input").type("123"); // Invalid format
cy.getBySel("bankaccount-accountNumber-input").type("456");
cy.getBySel("bankaccount-submit").click();

// Assert routing number error for invalid format
cy.getBySel("bankaccount-routingNumber-input-helper-text")
.should("be.visible")
.and("contain", "Must contain a valid routing number");
});
 });
});
