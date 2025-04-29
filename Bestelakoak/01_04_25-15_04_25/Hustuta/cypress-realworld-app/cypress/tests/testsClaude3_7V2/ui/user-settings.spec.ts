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
        // Verify the user settings form is displayed
        cy.getBySel("user-settings-form").should("be.visible");
        
        // Verify the form fields are populated with the current user's information
        cy.getBySel("user-settings-firstName-input").should("not.have.value", "");
        cy.getBySel("user-settings-lastName-input").should("not.have.value", "");
        cy.getBySel("user-settings-email-input").should("not.have.value", "");
        cy.getBySel("user-settings-phoneNumber-input").should("not.have.value", "");
        
        // Verify the submit button is visible
        cy.getBySel("user-settings-submit").should("be.visible");
    });
    
    it("should display user setting form errors", () => {
        // Clear all fields to trigger validation errors
        cy.getBySel("user-settings-firstName-input").clear();
        cy.getBySel("user-settings-lastName-input").clear();
        cy.getBySel("user-settings-email-input").clear();
        cy.getBySel("user-settings-phoneNumber-input").clear();
        
        // Try to submit the form
        cy.getBySel("user-settings-submit").click();
        
        // Verify error messages are displayed
        cy.get(".MuiFormHelperText-root").should("be.visible");
        cy.getBySel("user-settings-firstName-input").should("have.class", "Mui-error");
        cy.getBySel("user-settings-lastName-input").should("have.class", "Mui-error");
        cy.getBySel("user-settings-email-input").should("have.class", "Mui-error");
        
        // Enter invalid email format and check for specific error
        cy.getBySel("user-settings-firstName-input").type("First");
        cy.getBySel("user-settings-lastName-input").type("Last");
        cy.getBySel("user-settings-email-input").type("invalid-email");
        cy.getBySel("user-settings-submit").click();
        
        // Verify email format error is displayed
        cy.get(".MuiFormHelperText-root").should("be.visible");
        cy.get(".MuiFormHelperText-root").should("contain", "Enter a valid email address");
    });
    
    it("updates first name, last name, email and phone number", () => {
        // Clear all fields
        cy.getBySel("user-settings-firstName-input").clear();
        cy.getBySel("user-settings-lastName-input").clear();
        cy.getBySel("user-settings-email-input").clear();
        cy.getBySel("user-settings-phoneNumber-input").clear();
        
        // Enter new user information
        cy.getBySel("user-settings-firstName-input").type("New First Name");
        cy.getBySel("user-settings-lastName-input").type("New Last Name");
        cy.getBySel("user-settings-email-input").type("email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").type("6155551212");
        
        // Submit the form
        cy.getBySel("user-settings-submit").click();
        
        // Wait for the update request to complete
        cy.wait("@updateUser");
        
        // Verify success notification
        cy.getBySel("snackbar-success").should("be.visible");
        cy.getBySel("snackbar-success").should("contain", "User Settings Updated Successfully");
        
        // Refresh the page to ensure the changes persist
        cy.reload();
        
        // Wait for the page to load
        cy.getBySel("user-settings-form").should("be.visible");
        
        // Verify the form shows the updated values
        cy.getBySel("user-settings-firstName-input").should("have.value", "New First Name");
        cy.getBySel("user-settings-lastName-input").should("have.value", "New Last Name");
        cy.getBySel("user-settings-email-input").should("have.value", "email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").should("have.value", "6155551212");
        
        // Verify the updated name appears in the sidenav
        if (isMobile()) {
            cy.getBySel("sidenav-toggle").click();
        }
        cy.getBySel("sidenav-user-full-name").should("contain", "New First Name New Last Name");
    });
});
