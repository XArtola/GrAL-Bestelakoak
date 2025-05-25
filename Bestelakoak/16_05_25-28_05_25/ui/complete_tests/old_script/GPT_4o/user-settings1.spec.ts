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
// Verify that the user settings form is visible

cy.getBySel("user-settings-form").should("be.visible");



// Verify that all input fields are present and pre-filled with user information

cy.getBySel("user-settings-firstName-input").should("have.value", "New First Name");

cy.getBySel("user-settings-lastName-input").should("have.value", "New Last Name");

cy.getBySel("user-settings-email-input").should("have.value", "email@email.com");

cy.getBySel("user-settings-phoneNumber-input").should("have.value", "6155551212");
 });
});
