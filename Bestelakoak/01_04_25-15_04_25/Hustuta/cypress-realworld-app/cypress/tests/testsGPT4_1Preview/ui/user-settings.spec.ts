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
    it("renders the user settings form", () => { });
    it("should display user setting form errors", () => { });
    it("updates first name, last name, email and phone number", () => { });
    it("should allow a user to update their personal information", () => {
        // should allow a user to update their personal information
        // Visit user settings page
        cy.visit('/user-settings');
        // Fill in new user info
        cy.get('[data-test="user-settings-firstName-input"]').clear().type(updatedUserInfo.firstName);
        cy.get('[data-test="user-settings-lastName-input"]').clear().type(updatedUserInfo.lastName);
        cy.get('[data-test="user-settings-email-input"]').clear().type(updatedUserInfo.email);
        cy.get('[data-test="user-settings-phoneNumber-input"]').clear().type(updatedUserInfo.phoneNumber);
        // Submit the form
        cy.get('[data-test="user-settings-submit"]').click();
        // Assert the updated info is displayed
        cy.get('[data-test="user-settings-firstName-input"]').should('have.value', updatedUserInfo.firstName);
        cy.get('[data-test="user-settings-lastName-input"]').should('have.value', updatedUserInfo.lastName);
        cy.get('[data-test="user-settings-email-input"]').should('have.value', updatedUserInfo.email);
        cy.get('[data-test="user-settings-phoneNumber-input"]').should('have.value', updatedUserInfo.phoneNumber);
    });
});
