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
        // 1. Go to bank accounts page
        cy.visit("/bankaccounts");
        // 2. Click "Create" or similar
        cy.get("button").contains("Create").click();
        // 3. Fill in bank details
        cy.get("input[name='bankName']").type("The Best Bank");
        cy.get("input[name='accountNumber']").type("123456789");
        cy.get("input[name='routingNumber']").type("987654321");
        // 4. Submit and validate success
        cy.get("button[type='submit']").click();
        cy.contains("Bank account created").should("be.visible");
    });
    it("should display bank account form errors", () => {
        // 1. Go to Create Bank Account form
        cy.visit("/bankaccounts");
        cy.get("button").contains("Create").click();
        // 2. Submit empty form
        cy.get("button[type='submit']").click();
        // 3. Check for validation errors
        cy.contains("Please enter a valid bank name").should("be.visible");
        cy.contains("Please enter a valid account number").should("be.visible");
        cy.contains("Please enter a valid routing number").should("be.visible");
    });
    it("soft deletes a bank account", () => {
        // 1. Visit bank accounts
        cy.visit("/bankaccounts");
        // 2. Pick the first bank account to delete
        cy.get("[data-test=bankaccount-list-item]").first().within(() => {
            cy.get("[data-test=delete]").click();
        });
        // 3. Confirm soft delete
        cy.contains("Bank account deleted").should("be.visible");
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // 1. Use scenario with no existing bank accounts
        // (Assume db is reset or we manually remove all bank accounts)
        cy.task("db:seed");
        cy.visit("/bankaccounts");
        // 2. Check that onboarding modal is shown
        cy.contains("Welcome!").should("be.visible");
    });
});
