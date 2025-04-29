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
        // Verify that the user settings form is visible and prefilled with the correct values
        cy.getBySel("user-settings-form").should("be.visible");
        cy.getBySel("user-settings-firstName-input").should("have.value", "New First Name");
        cy.getBySel("user-settings-lastName-input").should("have.value", "New Last Name");
    });
    it("should display user setting form errors", () => {
        // Clear required fields to force validation errors then assert error messages are displayed
        cy.getBySel("user-settings-firstName-input").clear();
        cy.getBySel("user-settings-email-input").clear();
        cy.get("form[data-test='user-settings-form']").submit();
        cy.getBySel("user-settings-firstName-input").should("contain", "Enter a first name");
        cy.getBySel("user-settings-email-input").should("contain", "Enter an email address");
    });
    it("updates first name, last name, email and phone number", () => {
        // Update the settings form fields with new values and submit, then check for success notification
        cy.getBySel("user-settings-firstName-input").clear().type("New First Name");
        cy.getBySel("user-settings-lastName-input").clear().type("New Last Name");
        cy.getBySel("user-settings-email-input").clear().type("email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").clear().type("6155551212");
        cy.get("form[data-test='user-settings-form']").submit();
        cy.getBySel("success-message").should("contain", "Settings updated");
    });
});
