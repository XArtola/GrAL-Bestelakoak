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
// Clear existing field values
cy.getBySel("user-settings-firstName-input").clear();
cy.getBySel("user-settings-lastName-input").clear();
cy.getBySel("user-settings-email-input").clear();
cy.getBySel("user-settings-phoneNumber-input").clear();

// Type in new user information
cy.getBySel("user-settings-firstName-input")
.type("New First Name")
.should("have.value", "New First Name");

cy.getBySel("user-settings-lastName-input")
.type("New Last Name")
.should("have.value", "New Last Name");

cy.getBySel("user-settings-email-input")
.type("email@email.com")
.should("have.value", "email@email.com");

cy.getBySel("user-settings-phoneNumber-input")
.type("6155551212")
.should("have.value", "6155551212");

// Submit the form
cy.getBySel("user-settings-submit").click();

// Wait for the update request to complete
cy.wait("@updateUser");

// Verify form values persist after update
cy.getBySel("user-settings-firstName-input")
.should("have.value", "New First Name");
cy.getBySel("user-settings-lastName-input")
.should("have.value", "New Last Name");
cy.getBySel("user-settings-email-input")
.should("have.value", "email@email.com");
cy.getBySel("user-settings-phoneNumber-input")
.should("have.value", "6155551212");

// Verify success notification
cy.getBySel("user-settings-form-success")
.should("be.visible")
.and("contain", "User Settings Updated Successfully");
 });
});
