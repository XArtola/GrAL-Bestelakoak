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
// Verify the user settings form is visible
cy.getBySel("user-settings-form").should("be.visible");

// Verify all required input fields are present and visible
cy.getBySel("user-settings-firstName-input").should("be.visible");
cy.getBySel("user-settings-lastName-input").should("be.visible");
cy.getBySel("user-settings-email-input").should("be.visible");
cy.getBySel("user-settings-phoneNumber-input").should("be.visible");

// Verify form fields have current user data
cy.getBySel("user-settings-firstName-input").should("not.have.value", "");
cy.getBySel("user-settings-lastName-input").should("not.have.value", "");
cy.getBySel("user-settings-email-input").should("not.have.value", "");
cy.getBySel("user-settings-phoneNumber-input").should("not.have.value", "");

// Verify submit button is present and enabled
cy.getBySel("user-settings-submit").should("be.visible").and("be.enabled");
 });
});
