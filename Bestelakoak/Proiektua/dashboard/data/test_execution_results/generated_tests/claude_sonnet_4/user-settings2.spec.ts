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
    it("should display user setting form errors", () => {
// Clear all required fields to trigger validation errors

  cy.getBySel("user-settings-firstName-input").clear();
  cy.getBySel("user-settings-lastName-input").clear();
  cy.getBySel("user-settings-email-input").clear();
  cy.getBySel("user-settings-phoneNumber-input").clear();

  // Submit the form to trigger validation

  cy.getBySel("user-settings-submit").click();

  // Verify that validation error messages are displayed for required fields

  cy.contains("Enter a first name").should("be.visible");
  cy.contains("Enter a last name").should("be.visible");
  cy.contains("Enter an email address").should("be.visible");
  cy.contains("Enter a phone number").should("be.visible");

  // Test invalid email format

  cy.getBySel("user-settings-firstName-input").type("Test");
  cy.getBySel("user-settings-lastName-input").type("User");
  cy.getBySel("user-settings-email-input").type("invalid-email");
  cy.getBySel("user-settings-phoneNumber-input").type("123");
  cy.getBySel("user-settings-submit").click();

  // Verify email validation error

  cy.contains("Must contain a valid email address").should("be.visible");

  // Test invalid phone number format

  cy.getBySel("user-settings-email-input").clear().type("test@example.com");
  cy.getBySel("user-settings-phoneNumber-input").clear().type("abc");
  cy.getBySel("user-settings-submit").click();

  // Verify phone number validation error

  cy.contains("Phone number is not valid").should("be.visible");
 });
});
