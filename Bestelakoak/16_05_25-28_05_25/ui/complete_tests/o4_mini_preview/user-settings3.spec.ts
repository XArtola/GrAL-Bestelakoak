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
// Define the updated user info
const userInfo = {
firstName: "New First Name",
lastName: "New Last Name",
email: "email@email.com",
phoneNumber: "6155551212"
};

// Fill in each field with the new values
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

// Submit the form
cy.getBySel("user-settings-submit").click();

// Wait for the PATCH request to complete
cy.wait("@updateUser");

// Assert that a success notification appears
cy.getBySel("alert-bar-success")
.should("be.visible")
.and("contain", "User Settings Updated");

// Reload to verify persistence
cy.reload();

// Verify each field retains the updated value
cy.getBySel("user-settings-firstName-input")
.should("have.value", userInfo.firstName);
cy.getBySel("user-settings-lastName-input")
.should("have.value", userInfo.lastName);
cy.getBySel("user-settings-email-input")
.should("have.value", userInfo.email);
cy.getBySel("user-settings-phoneNumber-input")
.should("have.value", userInfo.phoneNumber);
 });
});
