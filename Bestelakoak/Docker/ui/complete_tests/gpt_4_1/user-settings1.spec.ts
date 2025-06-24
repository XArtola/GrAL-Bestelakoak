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
    it('renders the user settings form', () => {
    // renders the user settings form
    cy.getBySel("user-settings-form").should("be.visible");
    // Check that the form fields are populated with the current user's info
    cy.getBySel("user-settings-firstName").should("have.value").and("not.be.empty");
    cy.getBySel("user-settings-lastName").should("have.value").and("not.be.empty");
    cy.getBySel("user-settings-email").should("have.value").and("not.be.empty");
    cy.getBySel("user-settings-phoneNumber").should("have.value").and("not.be.empty");
    cy.getBySel("user-settings-save").should("be.enabled");
  });
});
