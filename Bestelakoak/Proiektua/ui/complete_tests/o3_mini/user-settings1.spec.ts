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
    it('renders the user settings form', () => {
    // it("renders the user settings form", () => { 
      // Verify that user settings form fields are visible
      cy.getBySel("settings-firstName").should("be.visible");
      cy.getBySel("settings-lastName").should("be.visible");
      cy.getBySel("settings-email").should("be.visible");
      cy.getBySel("settings-phoneNumber").should("be.visible");

      // Clear and update form fields with the new user information
      cy.getBySel("settings-firstName").clear().type(userInfo.firstName);
      cy.getBySel("settings-lastName").clear().type(userInfo.lastName);
      cy.getBySel("settings-email").clear().type(userInfo.email);
      cy.getBySel("settings-phoneNumber").clear().type(userInfo.phoneNumber);

      // Submit the settings form
      cy.getBySel("settings-submit").click();

      // Wait for the "updateUser" API call and assert it responds with a success status
      cy.wait("@updateUser").its("response.statusCode").should("eq", 200);

      // Verify that a success notification is displayed
      cy.getBySel("settings-success-msg").should("contain", "Settings updated");

      // Re-fetch form values to confirm the updates are reflected
      cy.getBySel("settings-firstName").should("have.value", userInfo.firstName);
      cy.getBySel("settings-lastName").should("have.value", userInfo.lastName);
      cy.getBySel("settings-email").should("have.value", userInfo.email);
      cy.getBySel("settings-phoneNumber").should("have.value", userInfo.phoneNumber);
    // });
  });
});
