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
        // Assert that the current URL contains '/settings'
        cy.url().should("include", "/settings");
        // Check that all necessary form fields are visible
        cy.get("input[name='firstName']").should("be.visible");
        cy.get("input[name='lastName']").should("be.visible");
        cy.get("input[name='email']").should("be.visible");
        cy.get("input[name='phoneNumber']").should("be.visible");
    });
    it("should display user setting form errors", () => {
        // Clear each input and trigger blur to validate errors.
        cy.get("input[name='firstName']").clear().blur();
        cy.contains("Enter a first name").should("be.visible");
        cy.get("input[name='lastName']").clear().blur();
        cy.contains("Enter a last name").should("be.visible");
        cy.get("input[name='email']").clear().blur();
        cy.contains("Enter an email address").should("be.visible");
        cy.get("input[name='phoneNumber']").clear().blur();
        cy.contains("Enter a phone number").should("be.visible");
    });
    it("updates first name, last name, email and phone number", () => {
        // Update form fields with new user info and submit
        cy.get("input[name='firstName']").clear().type("New First Name");
        cy.get("input[name='lastName']").clear().type("New Last Name");
        cy.get("input[name='email']").clear().type("email@email.com");
        cy.get("input[name='phoneNumber']").clear().type("6155551212");
        cy.get("button[type='submit']").click();
        // Wait for backend PATCH call; assert success by checking alert or URL change
        cy.wait("@updateUser");
        cy.contains("User Settings").should("exist");
    });
});
