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
    it("should display user setting form errors", () => {
// Clear all required fields and submit the form

cy.getBySel("user-settings-firstName-input").clear();

cy.getBySel("user-settings-lastName-input").clear();

cy.getBySel("user-settings-email-input").clear();

cy.getBySel("user-settings-phoneNumber-input").clear();

cy.getBySel("user-settings-submit").click();



// Verify validation error messages are displayed

cy.contains("Enter a first name").should("be.visible");

cy.contains("Enter a last name").should("be.visible");

cy.contains("Enter an email address").should("be.visible");

cy.contains("Enter a phone number").should("be.visible");
 });
});
