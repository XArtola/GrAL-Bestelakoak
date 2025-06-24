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
    it("should display login errors", () => {
// Visit the signin page

  cy.visit("/signin");

  // Test case 1: Empty form submission

  // Submit without entering any credentials

  cy.getBySel("signin-submit").click();

  // Verify validation errors for required fields

  cy.get("#username-helper-text").should("contain", "Username is required");
  cy.get("#password-helper-text").should("contain", "Password is required");

  // Test case 2: Invalid username

  cy.getBySel("signin-username").type("invalidUserName");
  cy.getBySel("signin-password").type("s3cret");
  cy.getBySel("signin-submit").click();

  // Verify error message for invalid username

  cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");

  // Clear the fields and try again with valid username but invalid password

  cy.getBySel("signin-username").clear().type("PainterJoy90");
  cy.getBySel("signin-password").clear().type("invalidPa$word");
  cy.getBySel("signin-submit").click();

  // Verify error message for invalid password

  cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
 });
});
