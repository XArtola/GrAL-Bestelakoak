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

.type(updatedUserInfo.firstName)

.should("have.value", updatedUserInfo.firstName);



cy.getBySel("user-settings-lastName-input")

.type(updatedUserInfo.lastName)

.should("have.value", updatedUserInfo.lastName);



cy.getBySel("user-settings-email-input")

.type(updatedUserInfo.email)

.should("have.value", updatedUserInfo.email);



cy.getBySel("user-settings-phoneNumber-input")

.type(updatedUserInfo.phoneNumber)

.should("have.value", updatedUserInfo.phoneNumber);



// Submit the form

cy.getBySel("user-settings-submit").click();



// Wait for the update request to complete

cy.wait("@updateUser");



// Verify form values persist after update

cy.getBySel("user-settings-firstName-input")

.should("have.value", updatedUserInfo.firstName);

cy.getBySel("user-settings-lastName-input")

.should("have.value", updatedUserInfo.lastName);

cy.getBySel("user-settings-email-input")

.should("have.value", updatedUserInfo.email);

cy.getBySel("user-settings-phoneNumber-input")

.should("have.value", updatedUserInfo.phoneNumber);



// Verify success notification

cy.getBySel("user-settings-form-success")

.should("be.visible")

.and("contain", "User Settings Updated Successfully");


 });
});
