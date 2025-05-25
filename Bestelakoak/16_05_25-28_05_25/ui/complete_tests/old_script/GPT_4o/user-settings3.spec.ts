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
// Step 1: Clear existing values in the form fields

cy.getBySel("user-settings-firstName-input").clear();

cy.getBySel("user-settings-lastName-input").clear();

cy.getBySel("user-settings-email-input").clear();

cy.getBySel("user-settings-phoneNumber-input").clear();



// Step 2: Enter new user information

cy.getBySel("user-settings-firstName-input").type(userInfo.firstName);

cy.getBySel("user-settings-lastName-input").type(userInfo.lastName);

cy.getBySel("user-settings-email-input").type(userInfo.email);

cy.getBySel("user-settings-phoneNumber-input").type(userInfo.phoneNumber);



// Step 3: Submit the form

cy.getBySel("user-settings-submit").click();



// Step 4: Wait for the update request to complete

cy.wait("@updateUser").its("response.statusCode").should("equal", 204);



// Step 5: Reload the page to verify changes persisted

cy.reload();



// Step 6: Verify updated information is displayed in the form

cy.getBySel("user-settings-firstName-input").should("have.value", userInfo.firstName);

cy.getBySel("user-settings-lastName-input").should("have.value", userInfo.lastName);

cy.getBySel("user-settings-email-input").should("have.value", userInfo.email);

cy.getBySel("user-settings-phoneNumber-input").should("have.value", userInfo.phoneNumber);



// Step 7: Verify success notification is displayed

cy.getBySel("snackbar-success").should("be.visible").and("contain", "User Settings Updated Successfully");
 });
});
