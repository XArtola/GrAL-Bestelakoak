import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
describe("User Settings", () => {
    beforeEach(() => {
        cy.task("db:seed");
        cy.intercept("PATCH", "/users/*").as("updateUser");
        cy.loginByXstate(Cypress.env("USER_USERNAME"), Cypress.env("USER_PASSWORD"));
    });

    it("should update user profile information", () => {
        cy.visit("/user/settings");
        
        // Update profile information
        cy.get("[data-test='user-settings-firstName-input']").clear().type("New First Name");
        cy.get("[data-test='user-settings-lastName-input']").clear().type("New Last Name");
        cy.get("[data-test='user-settings-email-input']").clear().type("email@email.com");
        cy.get("[data-test='user-settings-phoneNumber-input']").clear().type("6155551212");
        cy.get("[data-test='user-settings-submit']").click();

        // Verify update
        cy.wait("@updateUser");
        cy.get("[data-test='user-settings-firstName-input']").should("have.value", "New First Name");
        cy.get("[data-test='user-settings-lastName-input']").should("have.value", "New Last Name");
    });

    it("should display user settings form errors", () => {
        cy.visit("/user/settings");
        
        // Clear required fields
        cy.get("[data-test='user-settings-firstName-input']").clear();
        cy.get("[data-test='user-settings-lastName-input']").clear();
        cy.get("[data-test='user-settings-email-input']").clear();
        cy.get("[data-test='user-settings-submit']").click();

        // Verify error messages
        cy.get("[data-test='user-settings-firstName-error']").should("be.visible");
        cy.get("[data-test='user-settings-lastName-error']").should("be.visible");
        cy.get("[data-test='user-settings-email-error']").should("be.visible");
    });

    it("should validate email format", () => {
        cy.visit("/user/settings");
        
        // Enter invalid email
        cy.get("[data-test='user-settings-email-input']").clear().type("invalid-email");
        cy.get("[data-test='user-settings-submit']").click();

        // Verify error message
        cy.get("[data-test='user-settings-email-error']").should("be.visible");
    });

    it("should validate phone number format", () => {
        cy.visit("/user/settings");
        
        // Enter invalid phone number
        cy.get("[data-test='user-settings-phoneNumber-input']").clear().type("123");
        cy.get("[data-test='user-settings-submit']").click();

        // Verify error message
        cy.get("[data-test='user-settings-phoneNumber-error']").should("be.visible");
    });
});
