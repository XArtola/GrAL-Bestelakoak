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
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\user-settings.spec.ts
      cy.getBySel("user-settings-form").should("be.visible");
      cy.getBySel("user-settings-firstname").should("be.visible");
      cy.getBySel("user-settings-lastname").should("be.visible");
      cy.getBySel("user-settings-email").should("be.visible");
      cy.getBySel("user-settings-phone").should("be.visible");
      cy.getBySel("user-settings-submit").should("be.visible");
    });

    // should display user setting form errors
    it("should display user setting form errors", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\user-settings.spec.ts
      cy.getBySel("user-settings-firstname").clear();
      cy.getBySel("user-settings-lastname").clear();
      cy.getBySel("user-settings-email").clear();
      cy.getBySel("user-settings-phone").clear();
      cy.getBySel("user-settings-submit").click();
      cy.getBySel("user-settings-firstname-error").should("be.visible");
      cy.getBySel("user-settings-lastname-error").should("be.visible");
      cy.getBySel("user-settings-email-error").should("be.visible");
      cy.getBySel("user-settings-phone-error").should("be.visible");
    });

    // updates first name, last name, email and phone number
    it("updates first name, last name, email and phone number", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\user-settings.spec.ts
      cy.getBySel("user-settings-firstname").clear().type(this.updatedUserInfo.firstName);
      cy.getBySel("user-settings-lastname").clear().type(this.updatedUserInfo.lastName);
      cy.getBySel("user-settings-email").clear().type(this.updatedUserInfo.email);
      cy.getBySel("user-settings-phone").clear().type(this.updatedUserInfo.phoneNumber);
      cy.getBySel("user-settings-submit").click();
      cy.wait("@updateUser").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.getBySel("sidenav-user-settings").should("contain", this.updatedUserInfo.firstName);
        cy.getBySel("sidenav-user-settings").should("contain", this.updatedUserInfo.lastName);
      });
    });
});
