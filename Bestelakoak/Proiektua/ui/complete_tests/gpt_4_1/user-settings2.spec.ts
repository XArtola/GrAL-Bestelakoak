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
    // "should display user setting form errors"
    //
    // This test will:
    // 1. Clear required fields and attempt to submit.
    // 2. Assert that error messages are displayed for each required field.
    // 3. Enter invalid email and phone number, submit, and assert error messages.

    const userInfo = {
      firstName: "New First Name",
      lastName: "New Last Name",
      email: "email@email.com",
      phoneNumber: "6155551212"
    };

    // Step 1: Clear all required fields and submit
    cy.getBySel("user-settings-firstName-input").clear();
    cy.getBySel("user-settings-lastName-input").clear();
    cy.getBySel("user-settings-email-input").clear();
    cy.getBySel("user-settings-phoneNumber-input").clear();
    cy.getBySel("user-settings-submit").click();

    // Step 2: Assert error messages for required fields
    cy.getBySel("user-settings-firstName-input")
      .parent()
      .contains(/required/i);
    cy.getBySel("user-settings-lastName-input")
      .parent()
      .contains(/required/i);
    cy.getBySel("user-settings-email-input")
      .parent()
      .contains(/required/i);
    cy.getBySel("user-settings-phoneNumber-input")
      .parent()
      .contains(/required/i);

    // Step 3: Enter invalid email and phone number, submit, and assert error messages
    cy.getBySel("user-settings-firstName-input").type(userInfo.firstName);
    cy.getBySel("user-settings-lastName-input").type(userInfo.lastName);
    cy.getBySel("user-settings-email-input").type("invalid-email");
    cy.getBySel("user-settings-phoneNumber-input").type("abcde");
    cy.getBySel("user-settings-submit").click();

    cy.getBySel("user-settings-email-input")
      .parent()
      .contains(/invalid email/i);
    cy.getBySel("user-settings-phoneNumber-input")
      .parent()
      .contains(/invalid phone/i);
  });
});
