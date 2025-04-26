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
        cy.intercept("GET", "/bankAccounts").as("getBankAccounts");
        cy.intercept("POST", "/bankAccounts").as("createBankAccount");
        cy.intercept("DELETE", "/bankAccounts/*").as("deleteBankAccount");
        cy.loginByXstate(Cypress.env("USER_USERNAME"), Cypress.env("USER_PASSWORD"));
    });
    it("creates a new bank account", () => {
        cy.visit("/bankaccounts");
        cy.get("[data-test='bankaccount-new']").click();
        
        // Fill in bank account details
        cy.get("[data-test='bankaccount-bankName-input']").type("The Best Bank");
        cy.get("[data-test='bankaccount-routingNumber-input']").type("987654321");
        cy.get("[data-test='bankaccount-accountNumber-input']").type("123456789");
        cy.get("[data-test='bankaccount-submit']").click();

        // Verify new account appears in the list
        cy.wait("@createBankAccount");
        cy.get("[data-test='bankaccount-list']").should("contain", "The Best Bank");
    });

    it("should display bank account form errors", () => {
        cy.visit("/bankaccounts");
        cy.get("[data-test='bankaccount-new']").click();
        
        // Submit empty form
        cy.get("[data-test='bankaccount-submit']").click();
        cy.get("[data-test='bankaccount-bankName-error']").should("be.visible");
        cy.get("[data-test='bankaccount-routingNumber-error']").should("be.visible");
        cy.get("[data-test='bankaccount-accountNumber-error']").should("be.visible");

        // Invalid routing number
        cy.get("[data-test='bankaccount-bankName-input']").type("The Best Bank");
        cy.get("[data-test='bankaccount-routingNumber-input']").type("12345");
        cy.get("[data-test='bankaccount-accountNumber-input']").type("123456789");
        cy.get("[data-test='bankaccount-submit']").click();
        cy.get("[data-test='bankaccount-routingNumber-error']").should("be.visible");
    });

    it("soft deletes a bank account", () => { });

    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => { });

    it("should delete a bank account", () => {
        // Create a bank account first
        cy.visit("/bankaccounts");
        cy.get("[data-test='bankaccount-new']").click();
        cy.get("[data-test='bankaccount-bankName-input']").type("The Best Bank");
        cy.get("[data-test='bankaccount-routingNumber-input']").type("987654321");
        cy.get("[data-test='bankaccount-accountNumber-input']").type("123456789");
        cy.get("[data-test='bankaccount-submit']").click();
        cy.wait("@createBankAccount");

        // Delete the account
        cy.get("[data-test='bankaccount-delete']").first().click();
        cy.wait("@deleteBankAccount");
        
        // Verify account is removed
        cy.get("[data-test='bankaccount-list']").should("not.contain", "The Best Bank");
    });

    it("should list all user bank accounts", () => {
        cy.visit("/bankaccounts");
        cy.wait("@getBankAccounts");
        
        // Verify bank accounts list is visible
        cy.get("[data-test='bankaccount-list']").should("be.visible");
        cy.get("[data-test='bankaccount-list-item']").should("have.length.at.least", 1);
    });
});
