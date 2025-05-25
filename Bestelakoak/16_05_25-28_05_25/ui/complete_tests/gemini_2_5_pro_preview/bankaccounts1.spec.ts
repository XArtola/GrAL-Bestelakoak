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
// Navigate to the bank accounts page if not already there
cy.getBySel("sidenav-bankaccounts").click();
cy.wait("@gqlListBankAccountQuery");

// Click the "Create" button
cy.getBySel("bankaccount-new").click();

// Fill in the bank account form
cy.getBySel("bankaccount-bankName-input").type(userInfo.bankAccountInfo.bankName);
cy.getBySel("bankaccount-routingNumber-input").type(userInfo.bankAccountInfo.routingNumber);
cy.getBySel("bankaccount-accountNumber-input").type(userInfo.bankAccountInfo.accountNumber);

// Submit the form
cy.getBySel("bankaccount-submit").click();

// Wait for the mutation to complete
cy.wait("@gqlCreateBankAccountMutation");

// Verify the new bank account is displayed in the list
cy.getBySel("bankaccount-list").should("contain", userInfo.bankAccountInfo.bankName);
//
 });
});
