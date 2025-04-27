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
        const bankAccountInfo = {
            bankName: "The Best Bank",
            routingNumber: "987654321",
            accountNumber: "123456789"
        };
        
        // Navigate to the bank accounts page
        cy.getBySel("sidenav-bankaccounts").click();
        
        // Wait for the bank account list to load
        cy.wait("@gqlListBankAccountQuery");
        
        // Click on the create button
        cy.getBySel("bankaccount-new").click();
        
        // Fill in the bank account form
        cy.getBySel("bankaccount-bankName-input")
            .type(bankAccountInfo.bankName);
        cy.getBySel("bankaccount-routingNumber-input")
            .type(bankAccountInfo.routingNumber);
        cy.getBySel("bankaccount-accountNumber-input")
            .type(bankAccountInfo.accountNumber);
        
        // Submit the form
        cy.getBySel("bankaccount-submit").click();
        
        // Wait for the account to be created
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Verify the new bank account appears in the list
        cy.getBySel("bankaccount-list")
            .should("contain", bankAccountInfo.bankName)
            .and("contain", bankAccountInfo.accountNumber.slice(-4));
    });
    it("should display bank account form errors", () => {
        // Navigate to the bank accounts page
        cy.getBySel("sidenav-bankaccounts").click();
        
        // Wait for the bank account list to load
        cy.wait("@gqlListBankAccountQuery");
        
        // Click on the create button
        cy.getBySel("bankaccount-new").click();
        
        // Try to submit the form without filling in any fields
        cy.getBySel("bankaccount-submit").click();
        
        // Verify error messages for all fields
        cy.get("#bankaccount-bankName-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a bank name");
            
        cy.get("#bankaccount-routingNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a valid bank routing number");
            
        cy.get("#bankaccount-accountNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a valid bank account number");
        
        // Enter invalid values
        cy.getBySel("bankaccount-routingNumber-input").type("12345");
        cy.getBySel("bankaccount-accountNumber-input").type("12345");
        
        // Verify error messages for invalid values
        cy.get("#bankaccount-routingNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Must contain a valid routing number");
            
        cy.get("#bankaccount-accountNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Must contain a valid account number");
    });
    it("soft deletes a bank account", () => {
        const bankAccountInfo = {
            bankName: "The Best Bank",
            routingNumber: "987654321",
            accountNumber: "123456789"
        };
        
        // Navigate to the bank accounts page
        cy.getBySel("sidenav-bankaccounts").click();
        
        // Wait for the bank account list to load
        cy.wait("@gqlListBankAccountQuery");
        
        // Create a new bank account if none exists
        cy.getBySel("bankaccount-list").then(($list) => {
            if ($list.find('[data-test*="bankaccount-item"]').length === 0) {
                cy.getBySel("bankaccount-new").click();
                cy.getBySel("bankaccount-bankName-input").type(bankAccountInfo.bankName);
                cy.getBySel("bankaccount-routingNumber-input").type(bankAccountInfo.routingNumber);
                cy.getBySel("bankaccount-accountNumber-input").type(bankAccountInfo.accountNumber);
                cy.getBySel("bankaccount-submit").click();
                cy.wait("@gqlCreateBankAccountMutation");
            }
        });
        
        // Get the initial count of bank accounts
        cy.getBySel("bankaccount-list").find('[data-test*="bankaccount-item"]').its("length").then((initialCount) => {
            // Delete the first bank account
            cy.getBySel("bankaccount-delete").first().click();
            
            // Confirm deletion
            cy.getBySel("bankaccount-delete-confirmation").click();
            
            // Wait for the deletion to complete
            cy.wait("@gqlDeleteBankAccountMutation");
            
            // Verify the bank account was removed from the list (count decreased by 1)
            cy.getBySel("bankaccount-list").find('[data-test*="bankaccount-item"]')
                .should("have.length", initialCount - 1);
        });
    });
    it("renders an empty bank account list state with onboarding modal", () => {
        // First, delete any existing bank accounts
        cy.getBySel("sidenav-bankaccounts").click();
        cy.wait("@gqlListBankAccountQuery");
        
        cy.getBySel("bankaccount-list").then(($list) => {
            if ($list.find('[data-test*="bankaccount-item"]').length > 0) {
                // Delete all bank accounts
                for (let i = 0; i < $list.find('[data-test*="bankaccount-item"]').length; i++) {
                    cy.getBySel("bankaccount-delete").first().click();
                    cy.getBySel("bankaccount-delete-confirmation").click();
                    cy.wait("@gqlDeleteBankAccountMutation");
                }
            }
        });
        
        // Refresh the page to ensure clean state
        cy.getBySel("sidenav-bankaccounts").click();
        cy.wait("@gqlListBankAccountQuery");
        
        // Verify the empty state message and onboarding modal
        cy.getBySel("empty-list-header").should("contain", "No Bank Accounts");
        cy.getBySel("bankaccount-new").should("be.visible");
        cy.getBySel("user-onboarding-dialog").should("be.visible");
        cy.getBySel("user-onboarding-next").should("be.visible");
    });
});
