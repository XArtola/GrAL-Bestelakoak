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
// Create a new bank account first
cy.getBySel("bankaccount-new").click();

// Fill in bank account details
cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
cy.getBySel("bankaccount-routingNumber-input").type("987654321");
cy.getBySel("bankaccount-accountNumber-input").type("123456789");
cy.getBySel("bankaccount-submit").click();

// Wait for bank account creation
cy.wait("@gqlCreateBankAccountMutation");

// Verify bank account was created
cy.getBySel("bankaccount-list").should("contain", "The Best Bank");
cy.getBySel("bankaccount-list").should("contain", "123456789");

// Delete the bank account
cy.getBySel("bankaccount-delete").first().click();

// Confirm deletion in dialog
cy.getBySel("modal-delete-confirmation").should("be.visible");
cy.getBySel("modal-delete-confirmation-submit").click();

// Wait for deletion mutation
cy.wait("@gqlDeleteBankAccountMutation");

// Verify bank account was removed from list
cy.getBySel("bankaccount-list")
.should("not.contain", "The Best Bank")
.and("not.contain", "123456789");
 });
});
