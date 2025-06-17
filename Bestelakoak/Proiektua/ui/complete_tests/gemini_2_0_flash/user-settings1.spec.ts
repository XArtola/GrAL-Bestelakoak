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
    cy.getBySel("user-settings-form").should("be.visible");
            cy.getBySel("user-settings-firstname-input").should("be.visible");
            cy.getBySel("user-settings-lastname-input").should("be.visible");
            cy.getBySel("user-settings-email-input").should("be.visible");
            cy.getBySel("user-settings-phone-input").should("be.visible");
            cy.getBySel("user-settings-currency-select").should("be.visible");
            cy.getBySel("user-settings-language-select").should("be.visible");
            cy.getBySel("user-settings-theme-select").should("be.visible");
            cy.getBySel("user-settings-save").should("be.visible");
  });
});
