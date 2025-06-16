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

  // Submit form with empty fields to trigger validation errors

  cy.getBySel("user-settings-submit").click();

  // Verify error messages for required fields

  cy.get("form").contains(/first name is required|enter a first name/i).should("be.visible");
  cy.get("form").contains(/last name is required|enter a last name/i).should("be.visible");
  cy.get("form").contains(/email is required|enter an email|valid email/i).should("be.visible");
  cy.get("form").contains(/phone number is required|enter a phone number/i).should("be.visible");

  // Test specific field validation - Invalid email format

  cy.getBySel("user-settings-firstName-input").clear().type("Test");
  cy.getBySel("user-settings-lastName-input").clear().type("User");
  cy.getBySel("user-settings-email-input").clear().type("invalid-email");
  cy.getBySel("user-settings-phoneNumber-input").clear().type("6155551212");
  cy.getBySel("user-settings-submit").click();

  // Verify invalid email error

  cy.get("form").contains(/valid email|email format/i).should("be.visible");

  // Test specific field validation - Invalid phone number

  cy.getBySel("user-settings-firstName-input").clear().type("Test");
  cy.getBySel("user-settings-lastName-input").clear().type("User");
  cy.getBySel("user-settings-email-input").clear().type("valid@email.com");
  cy.getBySel("user-settings-phoneNumber-input").clear().type("abc");
  cy.getBySel("user-settings-submit").click();

  // Verify invalid phone number error

  cy.get("form").contains(/phone number is not valid|invalid phone/i).should("be.visible");
 });
});
