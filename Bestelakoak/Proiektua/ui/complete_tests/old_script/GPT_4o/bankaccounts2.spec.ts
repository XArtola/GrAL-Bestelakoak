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
// Step 1: Navigate to the bank accounts page

cy.getBySel("sidenav-bankaccounts").click();



// Step 2: Click on the "Create" button to open the bank account form

cy.getBySel("bankaccount-new").click();



// Step 3: Attempt to submit the form with missing fields

cy.getBySel("bankaccount-submit").click();



// Step 4: Verify error messages for each required field

cy.getBySel("bankaccount-bankName-input-error")

.should("be.visible")

.and("contain", "Bank name is required");

cy.getBySel("bankaccount-routingNumber-input-error")

.should("be.visible")

.and("contain", "Routing number is required");

cy.getBySel("bankaccount-accountNumber-input-error")

.should("be.visible")

.and("contain", "Account number is required");
 });
});
