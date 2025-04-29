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
        // Click on the bank accounts navigation item
        cy.getBySel("sidenav-bankaccounts").click();
        
        // Click on "Create" button
        cy.getBySel("bankaccount-new").click();
        
        // Fill out the bank account form
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        
        // Submit the form
        cy.getBySel("bankaccount-submit").click();
        
        // Wait for GraphQL mutation
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Verify the new bank account shows up in the list
        cy.getBySel("bankaccount-list").should("be.visible");
        cy.getBySel("bankaccount-list-item")
            .should("have.length.at.least", 1)
            .and("contain", "The Best Bank")
            .and("contain", "ending in 6789");
    });
    
    it("should display bank account form errors", () => {
        // Navigate to bank accounts
        cy.getBySel("sidenav-bankaccounts").click();
        
        // Click on "Create" button
        cy.getBySel("bankaccount-new").click();
        
        // Submit empty form
        cy.getBySel("bankaccount-submit").click();
        
        // Verify validation errors
        cy.getBySel("bankaccount-bankName-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a bank name");
            
        cy.getBySel("bankaccount-routingNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a valid bank routing number");
            
        cy.getBySel("bankaccount-accountNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a valid bank account number");
        
        // Enter invalid routing number
        cy.getBySel("bankaccount-bankName-input").type("Bank Name");
        cy.getBySel("bankaccount-routingNumber-input").type("12345");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
        
        // Verify routing number error
        cy.getBySel("bankaccount-routingNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Must contain a valid routing number");
    });
    
    it("soft deletes a bank account", () => {
        // First create a bank account
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-bankName-input").type("Delete Me Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Find and delete the bank account
        cy.getBySel("bankaccount-list").should("be.visible");
        cy.getBySel("bankaccount-list-item")
            .contains("Delete Me Bank")
            .parents("[data-test='bankaccount-list-item']")
            .within(() => {
                cy.getBySel("bankaccount-delete").click();
            });
        
        // Wait for the delete operation
        cy.wait("@gqlDeleteBankAccountMutation");
        
        // Verify the bank account is no longer visible
        cy.getBySel("bankaccount-list-item")
            .contains("Delete Me Bank")
            .should("not.exist");
    });
    
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // Create a new user without bank accounts
        cy.intercept("GET", "/bankAccounts", { body: [] });
        
        // Navigate to bank accounts
        cy.getBySel("sidenav-bankaccounts").click();
        
        // Verify empty state is shown
        cy.getBySel("empty-list-header").should("be.visible");
        cy.getBySel("bankaccount-new").should("be.visible");
        
        // Verify onboarding modal
        cy.getBySel("onboarding-dialog-title").should("be.visible");
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("user-onboarding-done").click();
        
        // Modal should be closed
        cy.getBySel("onboarding-dialog-title").should("not.exist");
    });
});
