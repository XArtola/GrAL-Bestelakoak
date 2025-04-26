import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";

// Updated user info from extracted-test-info.json
const updatedUserInfo = {
  firstName: "New First Name",
  lastName: "New Last Name",
  email: "email@email.com",
  phoneNumber: "6155551212"
};

describe("User Settings", function () {
    let originalUser: User;

    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("PATCH", "/users/*").as("updateUser");
        cy.intercept("GET", "/notifications*").as("getNotifications");
        cy.database("find", "users").then((user: User) => {
            originalUser = user; // Store the original user for comparison
            cy.loginByXstate(user.username);
        });
        if (isMobile()) {
            cy.getBySel("sidenav-toggle").click();
        }
        cy.getBySel("sidenav-user-settings").click();
    });

    it("renders the user settings form", () => {
      // Assert form elements are visible and contain original user data
      cy.getBySel("user-settings-firstName-input").should("be.visible").and("have.value", originalUser.firstName);
      cy.getBySel("user-settings-lastName-input").should("be.visible").and("have.value", originalUser.lastName);
      cy.getBySel("user-settings-email-input").should("be.visible").and("have.value", originalUser.email);
      cy.getBySel("user-settings-phoneNumber-input").should("be.visible").and("have.value", originalUser.phoneNumber);
      cy.getBySel("user-settings-submit").should("be.visible");
    });

    it("should display user setting form errors", () => {
      // Clear required fields
      cy.getBySel("user-settings-firstName-input").clear();
      cy.getBySel("user-settings-lastName-input").clear();
      cy.getBySel("user-settings-email-input").clear();
      cy.getBySel("user-settings-phoneNumber-input").clear();

      // Click save and assert required field errors
      cy.getBySel("user-settings-submit").click();
      cy.get("#user-settings-firstName-input-helper-text").should("contain", "First Name is required");
      cy.get("#user-settings-lastName-input-helper-text").should("contain", "Last Name is required");
      cy.get("#user-settings-email-input-helper-text").should("contain", "Email is required");
      cy.get("#user-settings-phoneNumber-input-helper-text").should("contain", "Phone Number is required");

      // Test invalid email format
      cy.getBySel("user-settings-email-input").type("invalid-email");
      cy.get("#user-settings-email-input-helper-text").should("contain", "Must be a valid email address");
      cy.getBySel("user-settings-email-input").clear(); // Clear for next test

      // Test invalid phone number format
      cy.getBySel("user-settings-phoneNumber-input").type("123");
      cy.get("#user-settings-phoneNumber-input-helper-text").should("contain", "Phone number is not valid");
    });

    it("updates first name, last name, email and phone number", () => {
      // Clear existing fields and type new info
      cy.getBySel("user-settings-firstName-input").clear().type(updatedUserInfo.firstName);
      cy.getBySel("user-settings-lastName-input").clear().type(updatedUserInfo.lastName);
      cy.getBySel("user-settings-email-input").clear().type(updatedUserInfo.email);
      cy.getBySel("user-settings-phoneNumber-input").clear().type(updatedUserInfo.phoneNumber);

      // Click save
      cy.getBySel("user-settings-submit").click();

      // Wait for update and assert success
      cy.wait("@updateUser");
      cy.getBySel("alert-bar-success").should("be.visible").and("contain", "User Settings Updated");

      // Reload or re-navigate to verify persistence (optional but good practice)
      cy.reload(); // Or navigate away and back
      if (isMobile()) {
          cy.getBySel("sidenav-toggle").click();
      }
      cy.getBySel("sidenav-user-settings").click();

      // Assert fields contain the updated values
      cy.getBySel("user-settings-firstName-input").should("have.value", updatedUserInfo.firstName);
      cy.getBySel("user-settings-lastName-input").should("have.value", updatedUserInfo.lastName);
      cy.getBySel("user-settings-email-input").should("have.value", updatedUserInfo.email);
      cy.getBySel("user-settings-phoneNumber-input").should("have.value", updatedUserInfo.phoneNumber);
    });
});
