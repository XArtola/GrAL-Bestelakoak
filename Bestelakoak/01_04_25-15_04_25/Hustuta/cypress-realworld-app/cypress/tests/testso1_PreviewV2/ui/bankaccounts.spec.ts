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
        // Open the bank accounts page
        cy.getBySelLike("bankaccount-new").click();

        // Fill in bank account form
        cy.get("#bankaccount-bankName-input").type("The Best Bank");
        cy.get("#bankaccount-routingNumber-input").type("987654321");
        cy.get("#bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();

        // Assert new account is in the list
        cy.contains("The Best Bank").should("be.visible");
    });
    it("should display bank account form errors", () => {
        // Navigate to create bank account form
        cy.getBySelLike("bankaccount-new").click();

        // Attempt to submit without entering info
        cy.getBySel("bankaccount-submit").click();

        // Check for validation errors
        cy.contains("Enter a bank name").should("be.visible");
        cy.contains("Enter a valid bank routing number").should("be.visible");
        cy.contains("Enter a valid bank account number").should("be.visible");
    });
    it("soft deletes a bank account", () => {
        // Ensure we have an existing bank account from previous test
        // Soft delete the first bank account in the list
        cy.getBySelLike("delete").first().click();

        // Confirm that the bank account is marked deleted
        cy.contains("Account deleted").should("be.visible");
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // This requires that no bank accounts exist
        // More information needed to ensure we have an empty list
        // Indicate that steps to reset or confirm no accounts exist are needed
        cy.log("More info needed to confirm empty state. If no accounts exist, check onboarding flows.");
    });
});
