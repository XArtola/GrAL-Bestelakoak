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
    it('should error for an invalid password for existing user', () => {
    // Visit the sign-in page

      cy.visit("/signin");

      // Fill in the username with a valid user

      cy.getBySel("signin-username").type("PainterJoy90");

      // Fill in the password with an invalid password

      cy.getBySel("signin-password").type("invalidPa$word");

      // Submit the login form

      cy.getBySel("signin-submit").click();

      // Assert that an error message is displayed

      cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
  });
});
