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
    // it("updates first name, last name, email and phone number", () => { });
    const userInfo = {
        firstName: "New First Name",
        lastName: "New Last Name",
        email: "email@email.com",
        phoneNumber: "6155551212"
    };

    // Step 1: Clear and update each field
    cy.get('[data-test="user-settings-firstName"]')
      .clear()
      .type(userInfo.firstName);

    cy.get('[data-test="user-settings-lastName"]')
      .clear()
      .type(userInfo.lastName);

    cy.get('[data-test="user-settings-email"]')
      .clear()
      .type(userInfo.email);

    cy.get('[data-test="user-settings-phoneNumber"]')
      .clear()
      .type(userInfo.phoneNumber);

    // Step 2: Submit the update form
    cy.get('[data-test="user-settings-submit"]').click();

    // Step 3: Wait for the PATCH request to complete and assert success
    cy.wait("@updateUser").its("response.statusCode").should("eq", 200);

    // Step 4: Verify that a success message is displayed (assuming such an element exists)
    cy.get('[data-test="user-settings-success"]').should("be.visible");

    // Step 5: Reload page and re-check that form fields contain the updated information
    cy.reload();

    cy.get('[data-test="user-settings-firstName"]').should("have.value", userInfo.firstName);
    cy.get('[data-test="user-settings-lastName"]').should("have.value", userInfo.lastName);
    cy.get('[data-test="user-settings-email"]').should("have.value", userInfo.email);
    cy.get('[data-test="user-settings-phoneNumber"]').should("have.value", userInfo.phoneNumber);
  });
});
