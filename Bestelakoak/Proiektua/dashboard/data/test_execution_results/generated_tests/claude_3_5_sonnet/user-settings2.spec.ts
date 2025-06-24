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
// Clear all required form fields

  cy.getBySel("user-settings-firstName-input").clear();
  cy.getBySel("user-settings-lastName-input").clear();
  cy.getBySel("user-settings-email-input").clear();
  cy.getBySel("user-settings-phoneNumber-input").clear();

  // Submit form with empty fields

  cy.getBySel("user-settings-submit").click();

  // Verify validation messages for required fields

  cy.get("form").contains("Enter a first name").should("be.visible");
  cy.get("form").contains("Enter a last name").should("be.visible");
  cy.get("form").contains("Must contain a valid email address").should("be.visible");

  // Test invalid phone number format

  cy.getBySel("user-settings-firstName-input").type("Test");
  cy.getBySel("user-settings-lastName-input").type("User");
  cy.getBySel("user-settings-email-input").type("valid@email.com");
  cy.getBySel("user-settings-phoneNumber-input").type("invalid");
  cy.getBySel("user-settings-submit").click();

  // Verify phone number validation message

  cy.getBySel("user-settings-phoneNumber-input").siblings("div").should("contain", "Phone number is not valid");
 });
});
