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
        // Verify that the user settings form is displayed
        cy.getBySel("user-settings-form").should("be.visible");
        
        // Verify that all input fields are present
        cy.getBySel("user-settings-firstName-input").should("be.visible");
        cy.getBySel("user-settings-lastName-input").should("be.visible");
        cy.getBySel("user-settings-email-input").should("be.visible");
        cy.getBySel("user-settings-phoneNumber-input").should("be.visible");
        
        // Verify the submit button exists
        cy.getBySel("user-settings-submit").should("be.visible");
    });
    it("should display user setting form errors", () => {
        // Clear out the firstName field
        cy.getBySel("user-settings-firstName-input")
            .clear()
            .blur();
        
        // Check for the firstName error
        cy.get("#user-settings-firstName-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a first name");
        
        // Clear out the lastName field
        cy.getBySel("user-settings-lastName-input")
            .clear()
            .blur();
        
        // Check for the lastName error
        cy.get("#user-settings-lastName-input-helper-text")
            .should("be.visible")
            .and("contain", "Enter a last name");
        
        // Enter an invalid email
        cy.getBySel("user-settings-email-input")
            .clear()
            .type("invalid-email")
            .blur();
        
        // Check for the email error
        cy.get("#user-settings-email-input-helper-text")
            .should("be.visible")
            .and("contain", "Must contain a valid email address");
        
        // Enter an invalid phone number
        cy.getBySel("user-settings-phoneNumber-input")
            .clear()
            .type("invalid-phone")
            .blur();
        
        // Check for the phone error
        cy.get("#user-settings-phoneNumber-input-helper-text")
            .should("be.visible")
            .and("contain", "Phone number is not valid");
        
        // Verify the submit button is disabled due to form errors
        cy.getBySel("user-settings-submit")
            .should("be.disabled");
    });
    it("updates first name, last name, email and phone number", () => {
        const userInfo = {
            firstName: "New First Name",
            lastName: "New Last Name",
            email: "email@email.com",
            phoneNumber: "6155551212"
        };
        
        // Clear and update firstName field
        cy.getBySel("user-settings-firstName-input")
            .clear()
            .type(userInfo.firstName);
        
        // Clear and update lastName field
        cy.getBySel("user-settings-lastName-input")
            .clear()
            .type(userInfo.lastName);
        
        // Clear and update email field
        cy.getBySel("user-settings-email-input")
            .clear()
            .type(userInfo.email);
        
        // Clear and update phoneNumber field
        cy.getBySel("user-settings-phoneNumber-input")
            .clear()
            .type(userInfo.phoneNumber);
        
        // Submit the form
        cy.getBySel("user-settings-submit")
            .click();
        
        // Wait for the update request to complete
        cy.wait("@updateUser").its("response.statusCode").should("equal", 204);
        
        // Verify the form reflects the updated values
        cy.getBySel("user-settings-firstName-input").should("have.value", userInfo.firstName);
        cy.getBySel("user-settings-lastName-input").should("have.value", userInfo.lastName);
        cy.getBySel("user-settings-email-input").should("have.value", userInfo.email);
        cy.getBySel("user-settings-phoneNumber-input").should("have.value", userInfo.phoneNumber);
    });
});
