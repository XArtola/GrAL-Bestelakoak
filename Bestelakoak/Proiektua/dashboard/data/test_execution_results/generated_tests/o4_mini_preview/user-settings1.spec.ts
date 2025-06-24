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
// Assert that the settings form is present  
cy.getBySel("user-settings-form").should("be.visible");

// Assert that all inputs are rendered  
cy.getBySel("user-settings-firstName-input").should("be.visible");  
cy.getBySel("user-settings-lastName-input").should("be.visible");  
cy.getBySel("user-settings-email-input").should("be.visible");  
cy.getBySel("user-settings-phoneNumber-input").should("be.visible");
 });
});
