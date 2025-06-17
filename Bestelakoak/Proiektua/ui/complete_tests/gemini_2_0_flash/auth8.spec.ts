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
    // Attempt to log in with an existing username but an invalid password

      cy.getBySel("signin-username").type("PainterJoy90");
      cy.getBySel("signin-password").type("invalidPa$word");
      cy.getBySel("signin-submit").click();

      // Assert that an error message is displayed

      cy.getBySel("signin-error").should("be.visible").contains("Incorrect username or password");
  });
});
