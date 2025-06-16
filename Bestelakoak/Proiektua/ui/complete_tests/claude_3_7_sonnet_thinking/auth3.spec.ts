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

  // Enter the valid username and password

  cy.getBySel("signin-username").type("PainterJoy90");
  cy.getBySel("signin-password").type("s3cret");

  // Check the "Remember Me" checkbox to enable 30-day session

  cy.getBySel("signin-remember-me").check();

  // Submit the login form

  cy.getBySel("signin-submit").click();

  // Verify successful login by checking we're on the home page

  cy.location("pathname").should("equal", "/");

  // Check that the session cookie exists and has approximately 30 days expiration

  cy.getCookie("connect.sid").then(cookie => {
    // Convert cookie expiry timestamp to date

    const cookieExpirationDate = new Date(cookie!.expiry! * 1000);
    const now = new Date();

    // Calculate difference in days between now and cookie expiration

    const daysDifference = Math.round((cookieExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Assert the cookie expires approximately 30 days from now (with 1 day margin)

    expect(daysDifference).to.be.closeTo(30, 1);
  });
 });
});
