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
    it('should redirect to the home page after login', () => {
    // should redirect to the home page after login

    // Step 1: Visit the sign-in page
    cy.visit("/signin");

    // Step 2: Fill in the login form with valid credentials using "userInfo" provided
    cy.get('input[name="username"]').type("PainterJoy90");
    cy.get('input[name="password"]').type("s3cret", { log: false });

    // Step 3: Submit the login form
    cy.get('button[type="submit"]').click();

    // Step 4: Wait for the sign-up API (intercepted as "signup") and login related network calls if any
    cy.wait("@signup");

    // Step 5: Assert that the URL redirects to the home page (assumes home page is at "/")
    cy.url().should("eq", Cypress.config().baseUrl + "/");

    // Optionally, verify presence of a home page element (e.g., a navigation bar or welcome message)
    cy.get("[data-test='home-banner']").should("be.visible");
  });
});
