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

  // 1. Test empty form submission

  cy.getBySel("signin-submit").click();

  // Verify field validation errors are shown

  cy.get("#username-helper-text").should("be.visible").and("contain", "Username is required");
  cy.get("#password-helper-text").should("be.visible").and("contain", "Password is required");

  // 2. Test invalid username with valid password

  cy.getBySel("signin-username").type("invalidUserName");
  cy.getBySel("signin-password").type("s3cret");
  cy.getBySel("signin-submit").click();

  // Wait for login attempt to complete

  cy.wait("@login");

  // Verify error message for invalid username

  cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");

  // Clear fields for next test

  cy.getBySel("signin-username").clear();
  cy.getBySel("signin-password").clear();

  // 3. Test valid username with invalid password

  cy.getBySel("signin-username").type("PainterJoy90");
  cy.getBySel("signin-password").type("INVALID");
  cy.getBySel("signin-submit").click();

  // Wait for login attempt to complete

  cy.wait("@login");

  // Verify error message for invalid password

  cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
 });
});
