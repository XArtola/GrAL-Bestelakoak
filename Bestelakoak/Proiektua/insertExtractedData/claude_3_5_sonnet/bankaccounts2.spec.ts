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
// Click on create new bank account button 

cy.getBySel("bankaccount-new").click();



// Step 1: Try submitting empty form first

cy.getBySel("bankaccount-submit").click();



// Verify error messages for all required fields

cy.getBySel("bankaccount-bankName-error")

.should("be.visible")

.and("contain", "Enter a bank name");



cy.getBySel("bankaccount-routingNumber-error")

.should("be.visible")

.and("contain", "Enter a valid routing number");



cy.getBySel("bankaccount-accountNumber-error")

.should("be.visible")

.and("contain", "Enter a valid account number");



// Step 2: Test invalid routing number format

cy.getBySel("bankaccount-bankName-input").type(bankAccountInfo.bankName);

cy.getBySel("bankaccount-routingNumber-input").type("12345"); // Invalid - too short

cy.getBySel("bankaccount-accountNumber-input").type(bankAccountInfo.accountNumber);



cy.getBySel("bankaccount-routingNumber-error")

.should("be.visible")

.and("contain", "Must contain a valid routing number");



// Step 3: Test invalid account number format

cy.getBySel("bankaccount-routingNumber-input").clear().type(bankAccountInfo.routingNumber);

cy.getBySel("bankaccount-accountNumber-input").clear().type("12345"); // Invalid - too short



cy.getBySel("bankaccount-accountNumber-error")

.should("be.visible")

.and("contain", "Must contain a valid account number");


 });
});
