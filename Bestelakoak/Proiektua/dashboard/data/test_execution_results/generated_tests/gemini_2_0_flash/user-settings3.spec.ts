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
    it('updates first name, last name, email and phone number', () => {
    // Enter new first name
          cy.getBySel("user-settings-firstName-input").clear().type("New First Name");
          // Enter new last name
          cy.getBySel("user-settings-lastName-input").clear().type("New Last Name");
          // Enter new email
          cy.getBySel("user-settings-email-input").clear().type("email@email.com");
          // Enter new phone number
          cy.getBySel("user-settings-phoneNumber-input").clear().type("6155551212");
          // Save changes
          cy.getBySel("user-settings-submit").click();
          // Verify that the user is updated
          cy.wait("@updateUser").then((interception) => {
            expect(interception.response.statusCode).to.equal(200);
            // Verify the updated user details
            cy.getBySel("sidenav-username").should("contain", "New First Name");
  });
});
