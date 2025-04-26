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
        // Verify that the user settings form is rendered
        cy.getBySel("user-settings-form").should("be.visible");
        
        // Verify that all form fields are present
        cy.getBySel("user-settings-firstName-input").should("be.visible");
        cy.getBySel("user-settings-lastName-input").should("be.visible");
        cy.getBySel("user-settings-email-input").should("be.visible");
        cy.getBySel("user-settings-phoneNumber-input").should("be.visible");
        cy.getBySel("user-settings-submit").should("be.visible");
        
        // Verify that the form fields are populated with the current user's information
        cy.getBySel("user-settings-firstName-input").should("not.have.value", "");
        cy.getBySel("user-settings-lastName-input").should("not.have.value", "");
        cy.getBySel("user-settings-email-input").should("not.have.value", "");
        cy.getBySel("user-settings-phoneNumber-input").should("not.have.value", "");
    });
    it("should display user setting form errors", () => {
        // Clear all the input fields first
        cy.getBySel("user-settings-firstName-input").clear();
        cy.getBySel("user-settings-lastName-input").clear();
        cy.getBySel("user-settings-email-input").clear();
        cy.getBySel("user-settings-phoneNumber-input").clear();
        
        // Try to submit the empty form
        cy.getBySel("user-settings-submit").click();
        
        // Verify that error messages are displayed for each required field
        cy.getBySel("user-settings-firstName-input").siblings("div").should("contain", "First Name is required");
        cy.getBySel("user-settings-lastName-input").siblings("div").should("contain", "Last Name is required");
        cy.getBySel("user-settings-email-input").siblings("div").should("contain", "Email is required");
        cy.getBySel("user-settings-phoneNumber-input").siblings("div").should("contain", "Phone Number is required");
        
        // Test email validation by entering an invalid email
        cy.getBySel("user-settings-firstName-input").type("Valid");
        cy.getBySel("user-settings-lastName-input").type("Name");
        cy.getBySel("user-settings-email-input").type("invalid-email");
        cy.getBySel("user-settings-phoneNumber-input").type("1234567890");
        cy.getBySel("user-settings-submit").click();
        
        // Verify that only the invalid email error is displayed
        cy.getBySel("user-settings-firstName-input").siblings("div").should("not.exist");
        cy.getBySel("user-settings-lastName-input").siblings("div").should("not.exist");
        cy.getBySel("user-settings-email-input").siblings("div").should("contain", "Please enter a valid email address");
        cy.getBySel("user-settings-phoneNumber-input").siblings("div").should("not.exist");
        
        // Test phone number validation by entering an invalid phone number
        cy.getBySel("user-settings-email-input").clear().type("valid@email.com");
        cy.getBySel("user-settings-phoneNumber-input").clear().type("abc");
        cy.getBySel("user-settings-submit").click();
        
        // Verify that only the invalid phone number error is displayed
        cy.getBySel("user-settings-firstName-input").siblings("div").should("not.exist");
        cy.getBySel("user-settings-lastName-input").siblings("div").should("not.exist");
        cy.getBySel("user-settings-email-input").siblings("div").should("not.exist");
        cy.getBySel("user-settings-phoneNumber-input").siblings("div").should("contain", "Phone number is not valid");
    });
    it("updates first name, last name, email and phone number", () => {
        // First, get and store the original user data for comparison
        let originalFirstName, originalLastName, originalEmail, originalPhone;
        
        cy.getBySel("user-settings-firstName-input").invoke("val").then(val => originalFirstName = val);
        cy.getBySel("user-settings-lastName-input").invoke("val").then(val => originalLastName = val);
        cy.getBySel("user-settings-email-input").invoke("val").then(val => originalEmail = val);
        cy.getBySel("user-settings-phoneNumber-input").invoke("val").then(val => originalPhone = val);
        
        // Clear all fields
        cy.getBySel("user-settings-firstName-input").clear();
        cy.getBySel("user-settings-lastName-input").clear();
        cy.getBySel("user-settings-email-input").clear();
        cy.getBySel("user-settings-phoneNumber-input").clear();
        
        // Enter new values from test data
        cy.getBySel("user-settings-firstName-input").type("New First Name");
        cy.getBySel("user-settings-lastName-input").type("New Last Name");
        cy.getBySel("user-settings-email-input").type("email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").type("6155551212");
        
        // Submit the form
        cy.getBySel("user-settings-submit").click();
        
        // Wait for the update request to complete
        cy.wait("@updateUser");
        
        // Verify a success alert is displayed
        cy.getBySel("user-settings-form-success").should("be.visible");
        
        // Verify the form fields still contain the updated values
        cy.getBySel("user-settings-firstName-input").should("have.value", "New First Name");
        cy.getBySel("user-settings-lastName-input").should("have.value", "New Last Name");
        cy.getBySel("user-settings-email-input").should("have.value", "email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").should("have.value", "6155551212");
        
        // Navigate away and back to the user settings page to confirm the changes persisted
        cy.getBySel("sidenav-home").click();
        cy.getBySel("sidenav-user-settings").click();
        
        // Verify the form fields contain the updated values after reload
        cy.getBySel("user-settings-firstName-input").should("have.value", "New First Name");
        cy.getBySel("user-settings-lastName-input").should("have.value", "New Last Name");
        cy.getBySel("user-settings-email-input").should("have.value", "email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").should("have.value", "6155551212");
        
        // Verify the user's display name in the UI is updated
        if (!isMobile()) {
            // On desktop, check the side navigation
            cy.getBySel("sidenav-user-full-name").should("contain", "New First Name New Last Name");
        } else {
            // On mobile, open the drawer to check the user name
            cy.getBySel("sidenav-toggle").click();
            cy.getBySel("sidenav-user-full-name").should("contain", "New First Name New Last Name");
        }
    });
});
