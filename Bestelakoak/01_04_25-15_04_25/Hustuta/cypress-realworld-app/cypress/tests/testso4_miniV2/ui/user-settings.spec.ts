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
        // ensure form is visible
        cy.getBySel("user-settings-form").should("exist");
        // fields pre‑filled
        cy.get("[data-test=user-settings-firstName-input]").should("have.value", ctx.authenticatedUser.firstName);
        cy.get("[data-test=user-settings-lastName-input]").should("have.value", ctx.authenticatedUser.lastName);
    });
    it("should display user setting form errors", () => {
        // clear required fields and submit
        cy.get("[data-test=user-settings-firstName-input]").clear();
        cy.get("[data-test=user-settings-lastName-input]").clear();
        cy.get("[data-test=user-settings-email-input]").clear();
        cy.get("[data-test=user-settings-phoneNumber-input]").clear();
        cy.get("[data-test=user-settings-submit]").click();
        // validation messages
        cy.contains("Enter a first name");
        cy.contains("Enter a last name");
        cy.contains("Enter an email address");
        cy.contains("Enter a phone number");
    });
    it("updates first name, last name, email and phone number", () => {
        // fill new data
        cy.get("[data-test=user-settings-firstName-input]").clear().type("New First Name");
        cy.get("[data-test=user-settings-lastName-input]").clear().type("New Last Name");
        cy.get("[data-test=user-settings-email-input]").clear().type("email@email.com");
        cy.get("[data-test=user-settings-phoneNumber-input]").clear().type("6155551212");
        cy.get("[data-test=user-settings-submit]").click();
        // send and confirm
        cy.wait("@updateUser");
        // new values persisted in UI
        cy.get("[data-test=user-settings-firstName-input]").should("have.value", "New First Name");
        cy.get("[data-test=user-settings-email-input]").should("have.value", "email@email.com");
    });
});
