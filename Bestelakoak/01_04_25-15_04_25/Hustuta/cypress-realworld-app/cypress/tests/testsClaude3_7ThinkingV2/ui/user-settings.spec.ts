import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
describe("User Settings", function () {
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("PATCH", "/users/*").as("updateUser");
        cy.intercept("GET", "/notifications*").as("getNotifications");
        cy.database("find", "users").then((user: User) => {
            cy.loginByXstate(user.username);
        });
        if (isMobile()) {
            cy.getBySel("sidenav-toggle").click();
        }
        cy.getBySel("sidenav-user-settings").click();
    });
    it("renders the user settings form", () => {
        // Verify the form is visible
        cy.getBySel("user-settings-form").should("be.visible");
        
        // Check that each input field exists
        cy.getBySel("user-settings-firstName-input").should("be.visible");
        cy.getBySel("user-settings-lastName-input").should("be.visible");
        cy.getBySel("user-settings-email-input").should("be.visible");
        cy.getBySel("user-settings-phoneNumber-input").should("be.visible");
        
        // Verify the submit button exists
        cy.getBySel("user-settings-submit").should("be.visible");
    });
    
    it("should display user setting form errors", () => {
        // Clear the form fields
        cy.getBySel("user-settings-firstName-input").clear();
        cy.getBySel("user-settings-lastName-input").clear();
        cy.getBySel("user-settings-email-input").clear().type("invalid-email");
        cy.getBySel("user-settings-phoneNumber-input").clear().type("invalid-phone");
        
        // Try to submit the form
        cy.getBySel("user-settings-submit").click();
        
        // Verify error messages are displayed
        cy.get("form").contains("Enter a first name").should("be.visible");
        cy.get("form").contains("Enter a last name").should("be.visible");
        cy.get("form").contains("Must contain a valid email address").should("be.visible");
        cy.get("form").contains("Phone number is not valid").should("be.visible");
    });
    
    it("updates first name, last name, email and phone number", () => {
        // Enter new user information
        cy.getBySel("user-settings-firstName-input").clear().type("New First Name");
        cy.getBySel("user-settings-lastName-input").clear().type("New Last Name");
        cy.getBySel("user-settings-email-input").clear().type("email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").clear().type("6155551212");
        
        // Submit the form
        cy.getBySel("user-settings-submit").click();
        
        // Wait for the update to complete
        cy.wait("@updateUser").its("response.statusCode").should("equal", 204);
        
        // Reload the page to verify changes persisted
        cy.reload();
        
        // Verify updated information is displayed in the form
        cy.getBySel("user-settings-firstName-input").should("have.value", "New First Name");
        cy.getBySel("user-settings-lastName-input").should("have.value", "New Last Name");
        cy.getBySel("user-settings-email-input").should("have.value", "email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").should("have.value", "6155551212");
    });
});
