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
// Step 1: Navigate to the Bank Accounts page

cy.getBySel("sidenav-bankaccounts").click();



// Step 2: Wait for the list query to finish loading existing accounts

cy.wait("@gqlListBankAccountQuery");



// Step 3: Open the "New Bank Account" form

cy.getBySel("bankaccount-new").click();



// Step 4: Fill out the bank account form using provided test data

cy.getBySel("bankaccount-bankName-input")

.type("The Best Bank");

cy.getBySel("bankaccount-routingNumber-input")

.type("987654321");

cy.getBySel("bankaccount-accountNumber-input")

.type("123456789");



// Step 5: Submit the form

cy.getBySel("bankaccount-submit").click();



// Step 6: Wait for the GraphQL mutation to complete

cy.wait("@gqlCreateBankAccountMutation");



// Step 7: Assert that the new account appears in the list

cy.getBySel("bankaccount-list")

.should("contain", "The Best Bank")

.and("contain", "123456789");
 });
});
