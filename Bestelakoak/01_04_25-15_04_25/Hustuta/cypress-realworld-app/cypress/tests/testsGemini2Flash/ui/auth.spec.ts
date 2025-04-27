import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
describe("User Sign-up and Login", function () {
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("POST", "/users").as("signup");
        cy.intercept("POST", apiGraphQL, (req) => {
            const { body } = req;
            if (body.hasOwnProperty("operationName") && body.operationName === "CreateBankAccount") {
                req.alias = "gqlCreateBankAccountMutation";
            }
        });
    });
    // should redirect unauthenticated user to signin page
    it("should redirect unauthenticated user to signin page", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      cy.visit("/");
      cy.url().should("include", "/signin");
    });

    // should redirect to the home page after login
    it("should redirect to the home page after login", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      cy.visit("/signin");
      cy.getBySel("signin-username").type(this.userInfo.username);
      cy.getBySel("signin-password").type(this.userInfo.password);
      cy.getBySel("signin-submit").click();
      cy.url().should("eq", "http://localhost:3000/");
    });

    // should remember a user for 30 days after login
    it("should remember a user for 30 days after login", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      cy.visit("/signin");
      cy.getBySel("signin-username").type(this.userInfo.username);
      cy.getBySel("signin-password").type(this.userInfo.password);
      cy.getBySel("signin-remember-me").click();
      cy.getBySel("signin-submit").click();
      cy.wait(500);
      cy.getCookie("connect.sid").should("exist");
    });

    // should allow a visitor to sign-up, login, and logout
    it("should allow a visitor to sign-up, login, and logout", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      const newUser = {
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        password: "password123",
      };

      cy.visit("/signup");
      cy.getBySel("signup-first-name").type(newUser.firstName);
      cy.getBySel("signup-last-name").type(newUser.lastName);
      cy.getBySel("signup-username").type(newUser.username);
      cy.getBySel("signup-password").type(newUser.password);
      cy.getBySel("signup-confirmPassword").type(newUser.password);
      cy.getBySel("signup-submit").click();
      cy.url().should("include", "/signin");

      cy.visit("/signin");
      cy.getBySel("signin-username").type(newUser.username);
      cy.getBySel("signin-password").type(newUser.password);
      cy.getBySel("signin-submit").click();
      cy.url().should("eq", "http://localhost:3000/");

      cy.getBySel("sidenav-signout").click();
      cy.url().should("include", "/signin");
    });

    // should display login errors
    it("should display login errors", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      cy.visit("/signin");
      cy.getBySel("signin-username").type(this.loginCredentials.invalidUsername);
      cy.getBySel("signin-password").type(this.loginCredentials.validPassword);
      cy.getBySel("signin-submit").click();
      cy.getBySel("signin-error").should("be.visible");
    });

    // should display signup errors
    it("should display signup errors", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      cy.visit("/signup");
      cy.getBySel("signup-submit").click();
      cy.url().should("include", "/signup");
    });

    // should error for an invalid user
    it("should error for an invalid user", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      cy.visit("/signin");
      cy.getBySel("signin-username").type("invaliduser");
      cy.getBySel("signin-password").type(this.loginCredentials.validPassword);
      cy.getBySel("signin-submit").click();
      cy.getBySel("signin-error").should("be.visible");
    });

    // should error for an invalid password for existing user
    it("should error for an invalid password for existing user", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\auth.spec.ts
      cy.visit("/signin");
      cy.getBySel("signin-username").type(this.userInfo.username);
      cy.getBySel("signin-password").type(this.loginCredentials.invalidPassword);
      cy.getBySel("signin-submit").click();
      cy.getBySel("signin-error").should("be.visible");
    });
});
