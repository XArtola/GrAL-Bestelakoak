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
        // Navigate to the bank accounts page
        cy.visit("/bankaccounts");
        cy.wait("@gqlListBankAccountQuery");

        // Click on the "Create" button to open the bank account form
        cy.get("[data-test=bankaccount-new]").click();
        
        // Fill out the bank account form with the provided test data
        cy.get("[data-test=bankaccount-bankName-input]").type("The Best Bank");
        cy.get("[data-test=bankaccount-routingNumber-input]").type("987654321");
        cy.get("[data-test=bankaccount-accountNumber-input]").type("123456789");
        
        // Submit the form
        cy.get("[data-test=bankaccount-submit]").click();
        
        // Wait for the GraphQL mutation to complete
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Verify we're redirected back to the bank accounts list
        cy.get("[data-test=bankaccount-list]").should("be.visible");
        
        // Verify new bank account is in the list
        cy.get("[data-test=bankaccount-list-item]").should("have.length.at.least", 1);
        cy.get("[data-test=bankaccount-list-item]").first().should("contain", "The Best Bank");
        cy.get("[data-test=bankaccount-delete]").should("be.visible");
    });
    it("should display bank account form errors", () => {
        // Navigate to the bank accounts page
        cy.visit("/bankaccounts");
        cy.wait("@gqlListBankAccountQuery");

        // Click on the "Create" button to open the form
        cy.get("[data-test=bankaccount-new]").click();
        
        // Try to submit the form without entering any data
        cy.get("[data-test=bankaccount-submit]").click();
        
        // Verify validation errors are displayed for all required fields
        cy.get("[data-test=bankaccount-bankName-input] + div")
          .should("be.visible")
          .and("contain", "Enter a bank name");
        cy.get("[data-test=bankaccount-routingNumber-input] + div")
          .should("be.visible")
          .and("contain", "Enter a valid bank routing number");
        cy.get("[data-test=bankaccount-accountNumber-input] + div")
          .should("be.visible")
          .and("contain", "Enter a valid bank account number");
        
        // Test validation with invalid routing number (too short)
        cy.get("[data-test=bankaccount-bankName-input]").type("The Best Bank");
        cy.get("[data-test=bankaccount-routingNumber-input]").type("12345");
        cy.get("[data-test=bankaccount-accountNumber-input]").type("123456789");
        cy.get("[data-test=bankaccount-submit]").click();
        
        // Verify specific error for routing number
        cy.get("[data-test=bankaccount-routingNumber-input] + div")
          .should("be.visible")
          .and("contain", "Must contain a valid routing number");
        
        // Clear fields and test invalid account number
        cy.get("[data-test=bankaccount-routingNumber-input]").clear();
        cy.get("[data-test=bankaccount-accountNumber-input]").clear();
        cy.get("[data-test=bankaccount-routingNumber-input]").type("987654321");
        cy.get("[data-test=bankaccount-accountNumber-input]").type("1234");
        cy.get("[data-test=bankaccount-submit]").click();
        
        // Verify specific error for account number
        cy.get("[data-test=bankaccount-accountNumber-input] + div")
          .should("be.visible")
          .and("contain", "Must contain a valid account number");
    });
    it("soft deletes a bank account", () => {
        // First, create a new bank account to ensure we have one to delete
        cy.visit("/bankaccounts");
        cy.wait("@gqlListBankAccountQuery");
        cy.get("[data-test=bankaccount-new]").click();
        cy.get("[data-test=bankaccount-bankName-input]").type("The Best Bank");
        cy.get("[data-test=bankaccount-routingNumber-input]").type("987654321");
        cy.get("[data-test=bankaccount-accountNumber-input]").type("123456789");
        cy.get("[data-test=bankaccount-submit]").click();
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Count the number of bank accounts before deletion
        cy.get("[data-test=bankaccount-list]").should("be.visible");
        cy.get("[data-test=bankaccount-list-item]").then(($items) => {
            const countBefore = $items.length;
            
            // Click on the delete button for the first bank account
            cy.get("[data-test=bankaccount-delete]").first().click();
            
            // Confirm deletion in the dialog
            cy.get("[data-test=bankaccount-delete-confirmation]").should("be.visible");
            cy.get("[data-test=bankaccount-delete-confirm]").click();
            
            // Wait for the delete mutation to complete
            cy.wait("@gqlDeleteBankAccountMutation");
            
            // If this was the only bank account, the list should be empty now
            // Otherwise, verify there's one less item in the list
            cy.get("[data-test=bankaccount-list-item]").should(($newItems) => {
                if (countBefore === 1) {
                    // If there was only one bank account, the list should now be empty
                    expect($newItems.length).to.equal(0);
                } else {
                    // Otherwise, there should be one fewer item in the list
                    expect($newItems.length).to.equal(countBefore - 1);
                }
            });
        });
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // First, delete any existing bank accounts to ensure empty state
        cy.visit("/bankaccounts");
        cy.wait("@gqlListBankAccountQuery");
        
        // Delete all bank accounts if they exist
        cy.get("body").then($body => {
            if ($body.find("[data-test=bankaccount-list-item]").length > 0) {
                // Delete each bank account until none remain
                cy.get("[data-test=bankaccount-list-item]").each(() => {
                    cy.get("[data-test=bankaccount-delete]").first().click();
                    cy.get("[data-test=bankaccount-delete-confirm]").click();
                    cy.wait("@gqlDeleteBankAccountMutation");
                });
                
                // Refresh the page to ensure we're in a clean state
                cy.visit("/bankaccounts");
                cy.wait("@gqlListBankAccountQuery");
            }
        });
        
        // Verify empty state is displayed
        cy.get("[data-test=empty-list-header]").should("be.visible")
          .and("contain", "No Bank Accounts");
          
        // Verify call-to-action is present
        cy.get("[data-test=bankaccount-new]").should("be.visible");
        
        // Check for onboarding modal
        cy.get("[data-test=user-onboarding-dialog]").should("be.visible");
        cy.get("[data-test=user-onboarding-next]").should("be.visible");
        
        // Close the onboarding modal if it blocks interaction
        cy.get("[data-test=user-onboarding-next]").click();
    });
});
