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
// Navigate to bank accounts page

cy.getBySel("sidenav-bankaccounts").click();



// Click the Create button to open the form

cy.getBySel("bankaccount-new").click();



// Try to submit empty form

cy.getBySel("bankaccount-submit").click();



// Verify that error messages appear for each required field

cy.get("#bankaccount-bankName-input-helper-text")

.should("be.visible")

.and("have.text", "Enter a bank name");



cy.get("#bankaccount-routingNumber-input-helper-text")

.should("be.visible")

.and("have.text", "Enter a valid bank routing number");



cy.get("#bankaccount-accountNumber-input-helper-text")

.should("be.visible")

.and("have.text", "Enter a valid bank account number");



// Fill in form with invalid data and check for specific validation errors



// Test invalid routing number (too short)

cy.getBySel("bankaccount-bankName-input").type("The Best Bank");

cy.getBySel("bankaccount-routingNumber-input").type("12345");

cy.getBySel("bankaccount-accountNumber-input").type("123456789");

cy.getBySel("bankaccount-submit").click();



cy.get("#bankaccount-routingNumber-input-helper-text")

.should("be.visible")

.and("have.text", "Must contain a valid routing number");



// Clear the form

cy.getBySel("bankaccount-bankName-input").clear();

cy.getBySel("bankaccount-routingNumber-input").clear();

cy.getBySel("bankaccount-accountNumber-input").clear();



// Test invalid account number (too short)

cy.getBySel("bankaccount-bankName-input").type("The Best Bank");

cy.getBySel("bankaccount-routingNumber-input").type("987654321");

cy.getBySel("bankaccount-accountNumber-input").type("12345");

cy.getBySel("bankaccount-submit").click();



cy.get("#bankaccount-accountNumber-input-helper-text")

.should("be.visible")

.and("have.text", "Must contain a valid account number");


 });
});
