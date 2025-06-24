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
    // Assume the login page is at "/signin"

      cy.visit("/signin");

      // Enter the valid username from userInfo and an invalid password from loginCredentials

      cy.get("[data-test=signin-username]").type("PainterJoy90");
      cy.get("[data-test=signin-password]").type("invalidPa$word", {
        log: false
      });

      // Submit the login form

      cy.get("[data-test=signin-submit]").click();

      // Assert that an error message is displayed indicating login failure

      cy.get("[data-test=signin-error]").should("be.visible").and("contain", "Incorrect username or password");
  });
});
