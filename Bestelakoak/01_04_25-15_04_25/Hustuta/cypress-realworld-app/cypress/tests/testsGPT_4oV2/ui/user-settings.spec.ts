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
        cy.getBySel("user-settings-form").should("be.visible");
        cy.getBySel("user-settings-firstName-input").should("be.visible");
        cy.getBySel("user-settings-lastName-input").should("be.visible");
        cy.getBySel("user-settings-email-input").should("be.visible");
        cy.getBySel("user-settings-phoneNumber-input").should("be.visible");
    });

    it("should display user setting form errors", () => {
        cy.getBySel("user-settings-firstName-input").clear().blur();
        cy.getBySel("user-settings-lastName-input").clear().blur();
        cy.getBySel("user-settings-email-input").clear().blur();
        cy.getBySel("user-settings-phoneNumber-input").clear().blur();
        cy.getBySel("user-settings-firstName-error").should("contain", "First Name is required");
        cy.getBySel("user-settings-lastName-error").should("contain", "Last Name is required");
        cy.getBySel("user-settings-email-error").should("contain", "Enter a valid email");
        cy.getBySel("user-settings-phoneNumber-error").should("contain", "Phone number is required");
    });

    it("updates first name, last name, email and phone number", () => {
        cy.getBySel("user-settings-firstName-input").clear().type("New First Name");
        cy.getBySel("user-settings-lastName-input").clear().type("New Last Name");
        cy.getBySel("user-settings-email-input").clear().type("email@email.com");
        cy.getBySel("user-settings-phoneNumber-input").clear().type("6155551212");
        cy.getBySel("user-settings-submit").click();
        cy.wait("@updateUser");
        cy.getBySel("user-settings-success").should("contain", "User updated successfully");
    });
});
