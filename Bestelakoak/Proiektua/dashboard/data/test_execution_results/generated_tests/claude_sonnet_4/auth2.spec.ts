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
    it("should redirect to the home page after login", () => {
// Visit the signin page

  cy.visit("/signin");

  // Enter valid login credentials

  cy.getBySel("signin-username").type("PainterJoy90");
  cy.getBySel("signin-password").type("s3cret");

  // Submit the login form

  cy.getBySel("signin-submit").click();

  // Verify successful login by checking redirection to home page

  cy.location("pathname").should("equal", "/");

  // Verify user is logged in by checking for user elements in the sidebar

  cy.getBySel("sidenav-user-full-name").should("be.visible");
 });
});
