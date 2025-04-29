import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
type BankAccountsTestCtx = {
    user?: User;
};
describe("Bank Accounts", function () {
    const ctx: BankAccountsTestCtx = {};
    const bankAccountInfo = {
        bankName: "The Best Bank",
        routingNumber: "987654321",
        accountNumber: "123456789",
    };
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
        // Navigate to Bank Accounts page
        if (isMobile()) {
            cy.getBySel("sidenav-toggle").click();
        }
        cy.getBySel("sidenav-bankaccounts").click();
        cy.wait("@gqlListBankAccountQuery");
    });
    it("creates a new bank account", () => {
        // Click create button
        cy.getBySel("bankaccount-new").click();
        // Fill form
        cy.getBySel("bankaccount-bankName-input").type(bankAccountInfo.bankName);
        cy.getBySel("bankaccount-routingNumber-input").type(bankAccountInfo.routingNumber);
        cy.getBySel("bankaccount-accountNumber-input").type(bankAccountInfo.accountNumber);
        // Submit form
        cy.getBySel("bankaccount-submit").click();
        // Wait for mutation
        cy.wait("@gqlCreateBankAccountMutation");
        // Assert new account is in the list
        cy.getBySel("bankaccount-list").should("contain", bankAccountInfo.bankName);
        // Assert success message
        cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Bank Account Created");
    });
    it("should display bank account form errors", () => {
        // Click create button
        cy.getBySel("bankaccount-new").click();
        // Check initial state (submit disabled)
        cy.getBySel("bankaccount-submit").should("be.disabled");
        // Trigger Bank Name error
        cy.getBySel("bankaccount-bankName-input").focus().blur();
        cy.get("#bankaccount-bankName-input-helper-text")
            .should("be.visible")
            .and("contain", "Bank Name is required");
        // Trigger Routing Number error
        cy.getBySel("bankaccount-routingNumber-input").focus().blur();
        cy.get("#bankaccount-routingNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Routing Number is required");
        // Trigger Account Number error
        cy.getBySel("bankaccount-accountNumber-input").focus().blur();
        cy.get("#bankaccount-accountNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Account Number is required");
        // Check submit still disabled
        cy.getBySel("bankaccount-submit").should("be.disabled");
        // Enter invalid routing number
        cy.getBySel("bankaccount-routingNumber-input").type("123");
        cy.get("#bankaccount-routingNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Must contain 9 digits");
        // Check submit still disabled
        cy.getBySel("bankaccount-submit").should("be.disabled");
    });
    it("soft deletes a bank account", () => {
        // Find the first delete button and click it
        cy.getBySelLike("bankaccount-delete").first().click();
        // Wait for mutation
        cy.wait("@gqlDeleteBankAccountMutation");
        // Assert the account is removed from the list (assuming there was only one initially from seed)
        // Adjust assertion if seed data changes
        cy.getBySel("bankaccount-list").children().should("have.length", 0);
        // Assert success message
        cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Bank Account Deleted");
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // Delete existing bank accounts for the user
        cy.database("filter", "bankaccounts", { userId: ctx.user?.id }).then((accounts) => {
            accounts.forEach((account: { id: string }) => cy.task("db:delete", { entity: "bankaccounts", id: account.id }));
        });
        // Reload the page to reflect the empty state
        cy.reload();
        cy.wait("@gqlListBankAccountQuery"); // Wait for the list query after reload
        // Assert empty list state
        cy.getBySel("bankaccount-list").should("not.exist");
        cy.getBySel("empty-list-header").should("be.visible").and("contain", "No Bank Accounts");
        // Assert onboarding dialog is visible
        cy.getBySel("user-onboarding-dialog").should("be.visible");
    });
});
