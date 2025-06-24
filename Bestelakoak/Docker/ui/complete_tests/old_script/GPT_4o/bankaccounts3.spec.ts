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
// Step 1: Navigate to the bank accounts page

cy.getBySel("sidenav-bankaccounts").click();



// Step 2: Wait for the bank accounts list to load

cy.wait("@gqlListBankAccountQuery");



// Step 3: Select the first bank account and click the delete button

cy.getBySel("bankaccount-list")

.find("[data-test='bankaccount-delete']")

.first()

.click();



// Step 4: Confirm the deletion

cy.getBySel("confirmation-dialog-confirm").click();



// Step 5: Wait for the delete mutation to complete

cy.wait("@gqlDeleteBankAccountMutation");



// Step 6: Assert that the bank account is no longer visible in the list

cy.getBySel("bankaccount-list")

.should("not.contain", "The Best Bank");
 });
});
