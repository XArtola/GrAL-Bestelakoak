import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";

describe("User Settings", function () {
  const updatedUserInfo = {
    firstName: "New First Name",
    lastName: "New Last Name",
    email: "email@email.com",
    phoneNumber: "6155551212",
  };

  beforeEach(function () {
    cy.task("db:seed");

    cy.intercept("PATCH", "/users/*").as("updateUser");
    cy.intercept("GET", "/notifications*").as("getNotifications");

    cy.database("find", "users").then((user: User) => {
      cy.loginByXstate(user.username);
    });

    // Navigate to settings page
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-user-settings").click();
  });

  it("renders the user settings form", () => {
    // Assert form elements are visible
    cy.getBySel("user-settings-form").should("be.visible");
    cy.getBySel("user-settings-firstName-input").should("be.visible");
    cy.getBySel("user-settings-lastName-input").should("be.visible");
    cy.getBySel("user-settings-email-input").should("be.visible");
    cy.getBySel("user-settings-phoneNumber-input").should("be.visible");
    cy.getBySel("user-settings-submit").should("be.visible");
    // Assert current URL path
    cy.location("pathname").should("equal", "/settings");
  });

  it("should display user setting form errors", () => {
    // Clear first name and check error
    cy.getBySel("user-settings-firstName-input").clear().blur();
    cy.get("#user-settings-firstName-input-helper-text")
      .should("be.visible")
      .and("contain", "First Name is required");
    // Clear last name and check error
    cy.getBySel("user-settings-lastName-input").clear().blur();
    cy.get("#user-settings-lastName-input-helper-text")
      .should("be.visible")
      .and("contain", "Last Name is required");
    // Clear email and check error
    cy.getBySel("user-settings-email-input").clear().blur();
    cy.get("#user-settings-email-input-helper-text").should("be.visible").and("contain", "Email is required");
    // Clear phone number and check error
    cy.getBySel("user-settings-phoneNumber-input").clear().blur();
    cy.get("#user-settings-phoneNumber-input-helper-text")
      .should("be.visible")
      .and("contain", "Phone Number is required");
    // Assert submit button is disabled
    cy.getBySel("user-settings-submit").should("be.disabled");

    // Enter invalid email and check error
    cy.getBySel("user-settings-email-input").type("invalid-email").blur();
    cy.get("#user-settings-email-input-helper-text").should("be.visible").and("contain", "Must be a valid email");
    // Enter invalid phone number and check error
    cy.getBySel("user-settings-phoneNumber-input").type("123").blur();
    cy.get("#user-settings-phoneNumber-input-helper-text")
      .should("be.visible")
      .and("contain", "Must be a valid phone number");
    // Assert submit button is still disabled
    cy.getBySel("user-settings-submit").should("be.disabled");
  });

  it("updates first name, last name, email and phone number", () => {
    // Update fields
    cy.getBySel("user-settings-firstName-input").clear().type(updatedUserInfo.firstName);
    cy.getBySel("user-settings-lastName-input").clear().type(updatedUserInfo.lastName);
    cy.getBySel("user-settings-email-input").clear().type(updatedUserInfo.email);
    cy.getBySel("user-settings-phoneNumber-input").clear().type(updatedUserInfo.phoneNumber);
    // Click save
    cy.getBySel("user-settings-submit").click();
    // Wait for update request
    cy.wait("@updateUser");
    // Assert success message
    cy.getBySel("alert-bar-success").should("be.visible").and("contain", "User Settings Updated");
    // Assert fields retain updated values after save
    cy.getBySel("user-settings-firstName-input").should("have.value", updatedUserInfo.firstName);
    cy.getBySel("user-settings-lastName-input").should("have.value", updatedUserInfo.lastName);
    cy.getBySel("user-settings-email-input").should("have.value", updatedUserInfo.email);
    cy.getBySel("user-settings-phoneNumber-input").should("have.value", updatedUserInfo.phoneNumber);
    // Assert sidenav name updates
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-user-full-name").should("contain", `${updatedUserInfo.firstName} ${updatedUserInfo.lastName}`);
  });
});
