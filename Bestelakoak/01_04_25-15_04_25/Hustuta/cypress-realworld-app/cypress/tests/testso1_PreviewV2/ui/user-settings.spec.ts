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
        // Check if the form fields are visible
        cy.get("#user-settings-firstName-input").should("be.visible");
        cy.get("#user-settings-lastName-input").should("be.visible");
        cy.get("#user-settings-email-input").should("be.visible");
        cy.get("#user-settings-phoneNumber-input").should("be.visible");
    });
    it("should display user setting form errors", () => {
        // Clear and try to submit
        cy.get("#user-settings-firstName-input").clear();
        cy.getBySel("user-settings-submit").click();
        cy.contains("First Name is required").should("be.visible");

        // Repeat for other fields if needed
    });
    it("updates first name, last name, email and phone number", () => {
        // Clear fields, update them and submit
        cy.get("#user-settings-firstName-input").clear().type("New First Name");
        cy.get("#user-settings-lastName-input").clear().type("New Last Name");
        cy.get("#user-settings-email-input").clear().type("email@email.com");
        cy.get("#user-settings-phoneNumber-input").clear().type("6155551212");

        cy.getBySel("user-settings-submit").click();

        // Check that the values were updated
        cy.contains("Settings Saved").should("be.visible");
        cy.reload();
        cy.get("#user-settings-firstName-input").should("have.value", "New First Name");
        cy.get("#user-settings-lastName-input").should("have.value", "New Last Name");
    });
});
