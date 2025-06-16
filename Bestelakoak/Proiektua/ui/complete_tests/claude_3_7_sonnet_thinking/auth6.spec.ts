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
    it("should display signup errors", () => {
// Visit the signup page

  cy.visit("/signup");

  // Test 1: Submit empty form

  cy.getBySel("signup-submit").click();

  // Check for required field error messages

  cy.get("#firstName-helper-text").should("contain", "First Name is required");
  cy.get("#lastName-helper-text").should("contain", "Last Name is required");
  cy.get("#username-helper-text").should("contain", "Username is required");
  cy.get("#password-helper-text").should("contain", "Enter your password");
  cy.get("#confirmPassword-helper-text").should("contain", "Confirm your password");

  // Test 2: Password mismatch

  cy.getBySel("signup-first-name").type("Bob");
  cy.getBySel("signup-last-name").type("Ross");
  cy.getBySel("signup-username").type("New" + "PainterJoy90");
  cy.getBySel("signup-password").type("s3cret");
  cy.getBySel("signup-confirmPassword").type("INVALID");
  cy.getBySel("signup-submit").click();

  // Check password mismatch error

  cy.get("#confirmPassword-helper-text").should("contain", "Password does not match");

  // Test 3: Existing username (clear fields for fresh test)

  cy.reload();

  // Fill form with existing username from seed data

  cy.getBySel("signup-first-name").type("Bob");
  cy.getBySel("signup-last-name").type("Ross");
  cy.getBySel("signup-username").type("PainterJoy90");
  cy.getBySel("signup-password").type("s3cret");
  cy.getBySel("signup-confirmPassword").type("s3cret");
  cy.getBySel("signup-submit").click();

  // Check for username exists error

  cy.wait("@signup");
  cy.getBySel("signup-error").should("be.visible").and("contain", "Username already exists");
 });
});
