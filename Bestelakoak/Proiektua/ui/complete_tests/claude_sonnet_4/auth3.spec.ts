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
    it("should remember a user for 30 days after login", () => {
// Visit the signin page

  cy.visit("/signin");

  // Fill in login credentials

  cy.getBySel("signin-username").type("PainterJoy90");
  cy.getBySel("signin-password").type("s3cret");

  // Check the remember me checkbox

  cy.getBySel("signin-remember-me").check();

  // Submit the login form

  cy.getBySel("signin-submit").click();

  // Verify successful login by checking we're redirected to home page

  cy.location("pathname").should("equal", "/");

  // Verify the session cookie exists and has approximately 30 days expiration

  cy.getCookie("connect.sid").then(cookie => {
    expect(cookie).to.exist;
    if (cookie && cookie.expiry) {
      const cookieExpirationDate = new Date(cookie.expiry * 1000);
      const now = new Date();
      const daysDifference = Math.round((cookieExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // The cookie should expire approximately 30 days from now (give or take a day for timing)

      expect(daysDifference).to.be.closeTo(30, 1);
    }
  });

  // Reload the page to verify session persistence

  cy.reload();

  // Should still be logged in (not redirected to signin)

  cy.location("pathname").should("equal", "/");
  cy.getBySel("sidenav-user-full-name").should("be.visible");
 });
});
