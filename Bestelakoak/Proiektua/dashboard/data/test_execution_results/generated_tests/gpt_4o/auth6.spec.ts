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
// <generated_code>

  // Visit the signup page

  cy.visit("/signup");

  // Submit the form without filling any fields

  cy.get("[data-test='signup-submit']").click();

  // Assert error messages for required fields

  cy.get("[data-test='signup-first-name']").should("have.class", "Mui-error");
  cy.get("[data-test='signup-last-name']").should("have.class", "Mui-error");
  cy.get("[data-test='signup-username']").should("have.class", "Mui-error");
  cy.get("[data-test='signup-password']").should("have.class", "Mui-error");
  cy.get("[data-test='signup-confirmPassword']").should("have.class", "Mui-error");

  // Enter mismatched passwords

  cy.get("[data-test='signup-first-name']").type("Bob");
  cy.get("[data-test='signup-last-name']").type("Ross");
  cy.get("[data-test='signup-username']").type("PainterJoy90");
  cy.get("[data-test='signup-password']").type("s3cret");
  cy.get("[data-test='signup-confirmPassword']").type("INVALID");
  cy.get("[data-test='signup-submit']").click();

  // Assert error message for mismatched passwords

  cy.contains("Password does not match").should("be.visible");

  // Enter a short password

  cy.get("[data-test='signup-password']").clear().type("123");
  cy.get("[data-test='signup-confirmPassword']").clear().type("123");
  cy.get("[data-test='signup-submit']").click();

  // Assert error message for password length

  cy.contains("Password must contain at least 4 characters").should("be.visible");

  // </generated_code>
 });
});
