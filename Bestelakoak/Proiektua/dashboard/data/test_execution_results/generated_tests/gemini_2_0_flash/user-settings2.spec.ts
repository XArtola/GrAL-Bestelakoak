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
    it('should display user setting form errors', () => {
    // Assert that the first name input is visible

      cy.getBySel("user-settings-firstName-input").should("be.visible");

      // Assert that the last name input is visible

      cy.getBySel("user-settings-lastName-input").should("be.visible");

      // Assert that the email input is visible

      cy.getBySel("user-settings-email-input").should("be.visible");

      // Assert that the phone number input is visible

      cy.getBySel("user-settings-phoneNumber-input").should("be.visible");

      // Assert that the save changes button is visible

      cy.getBySel("user-settings-submit").should("be.visible");
  });
});
