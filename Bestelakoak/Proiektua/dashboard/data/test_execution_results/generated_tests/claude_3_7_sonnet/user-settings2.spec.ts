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
// Clear all form fields

  cy.getBySel("user-settings-firstName-input").clear();
  cy.getBySel("user-settings-lastName-input").clear();
  cy.getBySel("user-settings-email-input").clear();
  cy.getBySel("user-settings-phoneNumber-input").clear();

  // Submit the form with empty fields to trigger validation errors

  cy.getBySel("user-settings-submit").click();

  // Verify that error messages appear for required fields

  cy.contains("Enter a first name").should("be.visible");
  cy.contains("Enter a last name").should("be.visible");
  cy.contains("Enter an email address").should("be.visible");
  cy.contains("Enter a phone number").should("be.visible");

  // Fill in fields with valid data except for phone number

  cy.getBySel("user-settings-firstName-input").type("New First Name");
  cy.getBySel("user-settings-lastName-input").type("New Last Name");
  cy.getBySel("user-settings-email-input").type("email@email.com");
  cy.getBySel("user-settings-phoneNumber-input").type("abc"); // Invalid phone number format

  // Submit the form again

  cy.getBySel("user-settings-submit").click();

  // Verify that only phone number error is displayed

  cy.contains("Enter a first name").should("not.exist");
  cy.contains("Enter a last name").should("not.exist");
  cy.contains("Enter an email address").should("not.exist");
  cy.contains("Phone number is not valid").should("be.visible");
 });
});
