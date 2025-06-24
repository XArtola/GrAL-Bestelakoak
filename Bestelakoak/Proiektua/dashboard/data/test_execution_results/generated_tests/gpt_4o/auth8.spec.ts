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
    it("should error for an invalid password for existing user", () => {
// <generated_code>

  // Visit the sign-in page

  cy.visit("/signin");

  // Enter valid username but invalid password

  cy.get("[data-test='signin-username']").type("PainterJoy90");
  cy.get("[data-test='signin-password']").type("invalidPa$word");

  // Submit the login form

  cy.get("[data-test='signin-submit']").click();

  // Verify error message is displayed

  cy.get("[data-test='signin-error']").should("be.visible").and("contain", "Username or password is invalid");

  // </generated_code>
 });
});
