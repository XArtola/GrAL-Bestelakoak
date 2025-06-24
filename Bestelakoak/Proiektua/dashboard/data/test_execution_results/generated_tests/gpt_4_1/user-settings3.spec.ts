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
    // "updates first name, last name, email and phone number"
    const userInfo = {
      firstName: "New First Name",
      lastName: "New Last Name",
      email: "email@email.com",
      phoneNumber: "6155551212",
    };

    // Step 1: Fill out the user settings form with new values
    cy.getBySel("user-settings-firstName-input")
      .clear()
      .type(userInfo.firstName);
    cy.getBySel("user-settings-lastName-input")
      .clear()
      .type(userInfo.lastName);
    cy.getBySel("user-settings-email-input")
      .clear()
      .type(userInfo.email);
    cy.getBySel("user-settings-phoneNumber-input")
      .clear()
      .type(userInfo.phoneNumber);

    // Step 2: Submit the form
    cy.getBySel("user-settings-submit").click();

    // Step 3: Wait for the PATCH request and assert it was successful
    cy.wait("@updateUser").its("response.statusCode").should("eq", 200);

    // Step 4: Assert that the form fields now show the updated values
    cy.getBySel("user-settings-firstName-input").should("have.value", userInfo.firstName);
    cy.getBySel("user-settings-lastName-input").should("have.value", userInfo.lastName);
    cy.getBySel("user-settings-email-input").should("have.value", userInfo.email);
    cy.getBySel("user-settings-phoneNumber-input").should("have.value", userInfo.phoneNumber);

    // Step 5: Optionally, check for a success notification or message
    cy.contains(/settings updated|success/i).should("exist");
  });
});
