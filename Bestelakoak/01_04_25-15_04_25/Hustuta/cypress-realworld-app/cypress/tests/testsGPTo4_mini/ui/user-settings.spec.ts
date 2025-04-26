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
        // Assert form fields are visible
        cy.get('input[name="firstName"]').should('be.visible');
        cy.get('input[name="lastName"]').should('be.visible');
        cy.get('input[name="email"]').should('be.visible');
        cy.get('input[name="phoneNumber"]').should('be.visible');
    });
    it("should display user setting form errors", () => {
        // Clear fields and submit to trigger validation
        cy.get('input[name="firstName"]').clear();
        cy.get('input[name="lastName"]').clear();
        cy.get('input[name="email"]').clear();
        cy.get('input[name="phoneNumber"]').clear();
        cy.get('button[type="submit"]').click();
        // Assert validation messages
        cy.contains('First name is required').should('be.visible');
        cy.contains('Last name is required').should('be.visible');
        cy.contains('Email is required').should('be.visible');
        cy.contains('Phone number is required').should('be.visible');
    });
    it("updates first name, last name, email and phone number", () => {
        // Fill with updated user info
        cy.get('input[name="firstName"]').clear().type(updatedUserInfo.firstName);
        cy.get('input[name="lastName"]').clear().type(updatedUserInfo.lastName);
        cy.get('input[name="email"]').clear().type(updatedUserInfo.email);
        cy.get('input[name="phoneNumber"]').clear().type(updatedUserInfo.phoneNumber);
        // Submit form
        cy.get('button[type="submit"]').click();
        cy.wait('@updateUser');
        // Reload and verify updated values
        cy.reload();
        cy.get('input[name="firstName"]').should('have.value', updatedUserInfo.firstName);
        cy.get('input[name="lastName"]').should('have.value', updatedUserInfo.lastName);
        cy.get('input[name="email"]').should('have.value', updatedUserInfo.email);
        cy.get('input[name="phoneNumber"]').should('have.value', updatedUserInfo.phoneNumber);
    });
});
