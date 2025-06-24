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
// <generated_code>

  // Clear and type the new first name

  cy.getBySel("user-settings-firstName-input").clear().type("New First Name");

  // Clear and type the new last name

  cy.getBySel("user-settings-lastName-input").clear().type("New Last Name");

  // Clear and type the new email

  cy.getBySel("user-settings-email-input").clear().type("email@email.com");

  // Clear and type the new phone number

  cy.getBySel("user-settings-phoneNumber-input").clear().type("6155551212");

  // Click the submit button

  cy.getBySel("user-settings-submit").click();

  // Wait for the updateUser API call

  cy.wait("@updateUser");

  // Reload the page to verify persistence

  cy.reload();

  // Assert that the first name input field has the updated value

  cy.getBySel("user-settings-firstName-input").should("have.value", "New First Name");

  // Assert that the last name input field has the updated value

  cy.getBySel("user-settings-lastName-input").should("have.value", "New Last Name");

  // Assert that the email input field has the updated value

  cy.getBySel("user-settings-email-input").should("have.value", "email@email.com");

  // Assert that the phone number input field has the updated value

  cy.getBySel("user-settings-phoneNumber-input").should("have.value", "6155551212");

  // </generated_code>
 });
});
