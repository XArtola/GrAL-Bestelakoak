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
        // Navigate to bank accounts page and open create form
        cy.visit("/bankaccounts");
        cy.get("button").contains("Create").click();
        // Fill in new bank account details
        cy.get("input[name='bankName']").type("The Best Bank");
        cy.get("input[name='accountNumber']").type("123456789");
        cy.get("input[name='routingNumber']").type("987654321");
        cy.get("button[type='submit']").click();
        cy.contains("Bank account created").should("be.visible");
    });
    it("should display bank account form errors", () => {
        // Open create bank account form and submit empty
        cy.visit("/bankaccounts");
        cy.get("button").contains("Create").click();
        cy.get("button[type='submit']").click();
        cy.contains("Please enter a valid bank name").should("be.visible");
        cy.contains("Please enter a valid account number").should("be.visible");
        cy.contains("Please enter a valid routing number").should("be.visible");
    });
    it("soft deletes a bank account", () => {
        // From the bank accounts list, select the first account and click delete
        cy.visit("/bankaccounts");
        cy.get("[data-test=bankaccount-list-item]").first().within(() => {
            cy.get("[data-test=delete]").click();
        });
        cy.contains("Bank account deleted").should("be.visible");
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // Reset the database to a state with no bank accounts and verify modal presence
        cy.task("db:seed");
        cy.visit("/bankaccounts");
        cy.contains("Welcome!").should("be.visible");
    });
});
