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
    it('should display login errors', () => {
    // Scenario 1: Invalid Username

      // Step 1: Visit the sign-in page

      cy.visit("/signin");

      // Step 2: Attempt login with an invalid username

      cy.get('[data-test="signin-username"]').clear().type("invalidUserName");
      cy.get('[data-test="signin-password"]').clear().type("s3cret");
      cy.get('[data-test="signin-submit"]').click();

      // Step 3: Verify that an error message is displayed

      cy.get('[data-test="signin-error"]').should("be.visible").and("contain", "Invalid username or password");

      // Scenario 2: Invalid Password

      // Step 4: Visit the sign-in page again

      cy.visit("/signin");

      // Step 5: Attempt login with a valid username and an invalid password

      cy.get('[data-test="signin-username"]').clear().type("PainterJoy90");
      cy.get('[data-test="signin-password"]').clear().type("invalidPa$word");
      cy.get('[data-test="signin-submit"]').click();

      // Step 6: Verify that an error message is displayed

      cy.get('[data-test="signin-error"]').should("be.visible").and("contain", "Invalid username or password");
  });
});
