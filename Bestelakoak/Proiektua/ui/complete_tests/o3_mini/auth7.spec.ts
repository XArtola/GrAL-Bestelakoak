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
    it('should error for an invalid user', () => {
    // it("should error for an invalid user")
    // Step 1: Visit the sign-up page (adjust the URL selector if needed)
    cy.visit("/signup");

    // Step 2: Fill in the sign-up form using valid data for first name, last name
    // but use an invalid username and an invalid password from the provided loginCredentials.
    cy.get('[data-test="signup-firstName"]').type("Bob");
    cy.get('[data-test="signup-lastName"]').type("Ross");
    cy.get('[data-test="signup-username"]').type("invalidUserName");
    cy.get('[data-test="signup-password"]').type("invalidPa$word");

    // Step 3: Submit the form to trigger the signup endpoint
    cy.get('[data-test="signup-submit"]').click();

    // Step 4: Wait for the signup request alias to complete and verify that it fails
    cy.wait("@signup").then((interception) => {
      // Assert that the response status indicates an error, e.g., 400 Bad Request
      expect(interception.response.statusCode).to.be.oneOf([400, 422]);
    });

    // Step 5: Verify that an appropriate error message is displayed on the UI
    cy.get('[data-test="signup-error"]')
      .should("be.visible")
      .and("contain", "Invalid user credentials"); // adjust message based on actual implementation
  });
});
