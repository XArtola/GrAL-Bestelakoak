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
// Verify that the user settings form is visible
cy.getBySel("user-settings-form").should("be.visible");

// Verify that all input fields are present and visible
// Note: To thoroughly test pre-filled values, access to the currently logged-in user's data (from the beforeEach block) would be required here.
// The provided 'updatedUserInfo' is intended for tests related to updating user information, not for verifying the initial render state of the form.
cy.getBySel("user-settings-firstName-input").should("be.visible");
cy.getBySel("user-settings-lastName-input").should("be.visible");
cy.getBySel("user-settings-email-input").should("be.visible");
cy.getBySel("user-settings-phoneNumber-input").should("be.visible");

// Verify that the submit button is present and visible
cy.getBySel("user-settings-submit").should("be.visible");
 });
});
