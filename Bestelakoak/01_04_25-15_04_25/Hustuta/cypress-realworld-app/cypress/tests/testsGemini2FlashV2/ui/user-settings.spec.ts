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

    // renders the user settings form
    it("renders the user settings form", () => {
        cy.getBySel("user-settings-form").should("be.visible");
    });

    // should display user setting form errors
    it("should display user setting form errors", () => {
        cy.getBySel("user-settings-form-firstName").clear();
        cy.getBySel("user-settings-form-submit").click();
        cy.getBySel("user-settings-form-firstName-error").should("be.visible");
    });

    // updates first name, last name, email and phone number
    it("updates first name, last name, email and phone number", () => {
        cy.getBySel("user-settings-form-firstName").clear().type("New First Name");
        cy.getBySel("user-settings-form-lastName").clear().type("New Last Name");
        cy.getBySel("user-settings-form-email").clear().type("email@email.com");
        cy.getBySel("user-settings-form-phoneNumber").clear().type("6155551212");
        cy.getBySel("user-settings-form-submit").click();
        cy.wait("@updateUser").then((interception) => {
            if (interception.response) {
                assert.equal(interception.response.statusCode, 200);
            }
        });
    });
});
