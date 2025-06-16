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
    it("updates first name, last name, email and phone number", () => {
// Define user information for updating

  const userInfo = {
    firstName: "New First Name",
    lastName: "New Last Name",
    email: "email@email.com",
    phoneNumber: "6155551212"
  };

  // Clear existing field values

  cy.getBySel("user-settings-firstName-input").clear();
  cy.getBySel("user-settings-lastName-input").clear();
  cy.getBySel("user-settings-email-input").clear();
  cy.getBySel("user-settings-phoneNumber-input").clear();

  // Fill form with new user information

  cy.getBySel("user-settings-firstName-input").type(userInfo.firstName);
  cy.getBySel("user-settings-lastName-input").type(userInfo.lastName);
  cy.getBySel("user-settings-email-input").type(userInfo.email);
  cy.getBySel("user-settings-phoneNumber-input").type(userInfo.phoneNumber);

  // Submit form to update settings

  cy.getBySel("user-settings-submit").click();

  // Wait for update request to complete

  cy.wait("@updateUser");

  // Reload page to verify changes persisted

  cy.reload();

  // Verify form fields show updated values

  cy.getBySel("user-settings-firstName-input").should("have.value", userInfo.firstName);
  cy.getBySel("user-settings-lastName-input").should("have.value", userInfo.lastName);
  cy.getBySel("user-settings-email-input").should("have.value", userInfo.email);
  cy.getBySel("user-settings-phoneNumber-input").should("have.value", userInfo.phoneNumber);
 });
});
