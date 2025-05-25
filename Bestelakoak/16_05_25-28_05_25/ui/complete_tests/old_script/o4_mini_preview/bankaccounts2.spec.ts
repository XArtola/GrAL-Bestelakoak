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
// 1. Navigate to the Bank Accounts page

cy.getBySel("sidenav-bankaccounts").click();

cy.wait("@gqlListBankAccountQuery");



// 2. Open the "Create Bank Account" form

cy.getBySel("bankaccount-new").click();



// 3. Submit the form without entering any data

cy.getBySel("bankaccount-submit").click();



// 4. Verify that validation errors appear for each required field

cy.getBySel("bankaccount-bankName-input")

.should("have.attr", "aria-invalid", "true");

cy.contains("Bank name is required").should("be.visible");



cy.getBySel("bankaccount-routingNumber-input")

.should("have.attr", "aria-invalid", "true");

cy.contains("Routing number is required").should("be.visible");



cy.getBySel("bankaccount-accountNumber-input")

.should("have.attr", "aria-invalid", "true");

cy.contains("Account number is required").should("be.visible");
 });
});
