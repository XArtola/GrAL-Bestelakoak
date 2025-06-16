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
    it("renders the user settings form", () => {
// Verify the form is visible

  cy.getBySel("user-settings-form").should("be.visible");

  // Verify all form fields are visible

  cy.getBySel("user-settings-firstName-input").should("be.visible");
  cy.getBySel("user-settings-lastName-input").should("be.visible");
  cy.getBySel("user-settings-email-input").should("be.visible");
  cy.getBySel("user-settings-phoneNumber-input").should("be.visible");

  // Verify submit button is present

  cy.getBySel("user-settings-submit").should("be.visible");

  // Optional: Verify form fields contain expected values from the current user

  // Note: This depends on what data is available in the seeded user

  cy.getBySel("user-settings-firstName-input").should("not.have.value", "");
  cy.getBySel("user-settings-lastName-input").should("not.have.value", "");
  cy.getBySel("user-settings-email-input").should("not.have.value", "");
  cy.getBySel("user-settings-phoneNumber-input").should("not.have.value", "");
 });
});
