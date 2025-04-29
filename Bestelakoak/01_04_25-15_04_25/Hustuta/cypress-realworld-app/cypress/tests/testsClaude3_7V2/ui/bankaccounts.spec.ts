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
        // Navigate to the Bank Accounts page
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-new").click();
        
        // Fill out the bank account form
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        
        // Submit the form
        cy.getBySel("bankaccount-submit").click();
        
        // Wait for the GraphQL mutation to complete
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Verify the new bank account is listed
        cy.getBySel("bankaccount-list").should("be.visible");
        cy.getBySel("bankaccount-list-item").should("contain", "The Best Bank");
        cy.getBySel("bankaccount-list-item").should("contain", "123456789");
    });
    
    it("should display bank account form errors", () => {
        // Navigate to the Bank Accounts page
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-new").click();
        
        // Submit the form without entering any data
        cy.getBySel("bankaccount-submit").click();
        
        // Verify error messages are displayed for each required field
        cy.getBySel("bankaccount-bankName-input").should("have.class", "Mui-error");
        cy.getBySel("bankaccount-routingNumber-input").should("have.class", "Mui-error");
        cy.getBySel("bankaccount-accountNumber-input").should("have.class", "Mui-error");
        cy.get(".MuiFormHelperText-root").should("be.visible");
        
        // Test invalid routing number format
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("12345"); // Too short
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
        
        // Verify specific routing number error
        cy.get(".MuiFormHelperText-root").should("contain", "Must contain a valid routing number");
    });
    
    it("soft deletes a bank account", () => {
        // First create a bank account
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-new").click();
        
        // Fill out the bank account form
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Now delete the bank account
        cy.getBySel("bankaccount-list").should("be.visible");
        cy.getBySel("bankaccount-delete").first().click();
        
        // Wait for the delete mutation
        cy.wait("@gqlDeleteBankAccountMutation");
        
        // Confirm the bank account was deleted (should no longer be in the list)
        cy.getBySel("bankaccount-list-item").should("not.contain", "The Best Bank");
        
        // Alternatively, check if delete success message is shown
        cy.getBySel("alert-bar-success").should("be.visible");
    });
    
    it("renders an empty bank account list state with onboarding modal", () => {
        // Create a new user without bank accounts
        cy.task("db:seed");
        
        // Delete any existing bank accounts for this user
        cy.database("find", "users").then((user: User) => {
            ctx.user = user;
            
            // Login with the user
            cy.loginByXstate(ctx.user.username);
            
            // Visit the bank accounts page
            cy.getBySel("sidenav-bankaccounts").click();
            
            // Check if there are any bank accounts to delete
            cy.get("body").then($body => {
                if ($body.find('[data-test="bankaccount-list-item"]').length > 0) {
                    // Delete all existing bank accounts
                    cy.getBySel("bankaccount-delete").each(($el) => {
                        cy.wrap($el).click();
                        cy.wait("@gqlDeleteBankAccountMutation");
                    });
                }
            });
            
            // Refresh the page to ensure empty state is shown
            cy.reload();
            
            // Verify empty bank account list state and onboarding modal
            cy.getBySel("empty-list-header").should("contain", "No Bank Accounts");
            cy.getBySel("bankaccount-new").should("be.visible");
            cy.getBySel("user-onboarding-dialog").should("be.visible");
            cy.getBySel("user-onboarding-next").should("be.visible");
        });
    });
});
