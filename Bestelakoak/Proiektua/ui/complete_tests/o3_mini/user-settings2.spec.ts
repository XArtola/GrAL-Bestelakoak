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
    // Test invalid email format by entering an incorrect email

      cy.getBySel("user-settings-email").clear().type("invalid-email");
      cy.getBySel("user-settings-email").blur();
      cy.getBySel("user-settings-email-error").should("be.visible").and("contain", "Invalid email");

      // Test empty first name field

      cy.getBySel("user-settings-firstName").clear();
      cy.getBySel("user-settings-firstName").blur();
      cy.getBySel("user-settings-firstName-error").should("be.visible").and("contain", "First name is required");

      // Test empty last name field

      cy.getBySel("user-settings-lastName").clear();
      cy.getBySel("user-settings-lastName").blur();
      cy.getBySel("user-settings-lastName-error").should("be.visible").and("contain", "Last name is required");

      // Test invalid phone number by entering alphabetic characters

      cy.getBySel("user-settings-phoneNumber").clear().type("abc123");
      cy.getBySel("user-settings-phoneNumber").blur();
      cy.getBySel("user-settings-phoneNumber-error").should("be.visible").and("contain", "Invalid phone number");

      // Attempt to submit the form

      cy.getBySel("user-settings-submit").click();

      // Verify that the form is not submitted by staying on the same page

      cy.url().should("include", "/user-settings");
  });
});
