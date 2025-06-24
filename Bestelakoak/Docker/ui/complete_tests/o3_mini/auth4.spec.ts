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
    it('should allow a visitor to sign-up, login, and logout', () => {
    // Test: should allow a visitor to sign-up, login, and logout

    // Step 1: Sign-up
    cy.visit('/signup'); // Visit the sign-up page
    cy.get('[data-test="signup-firstname"]').type("Bob"); // Enter first name
    cy.get('[data-test="signup-lastname"]').type("Ross"); // Enter last name
    cy.get('[data-test="signup-username"]').type("PainterJoy90"); // Enter username
    cy.get('[data-test="signup-password"]').type("s3cret"); // Enter password
    cy.get('[data-test="signup-submit"]').click(); // Submit sign-up form

    // Wait for the sign-up API call to complete and verify success status (assumed 201)
    cy.wait('@signup').its('response.statusCode').should('eq', 201);

    // Verify sign-up success (example: welcome message or redirection)
    cy.contains(`Welcome, ${"Bob"}`).should('be.visible');

    // Step 2: Logout after sign-up (if the app auto-signs in)
    cy.get('[data-test="logout"]').click();
    cy.url().should('include', '/signin');

    // Step 3: Login with valid credentials
    cy.get('[data-test="signin-username"]').type("PainterJoy90"); // Enter username
    cy.get('[data-test="signin-password"]').type("s3cret"); // Enter password
    cy.get('[data-test="signin-submit"]').click(); // Submit login form

    // Verify that the login was successful (e.g., redirected to dashboard)
    cy.url().should('include', '/dashboard');
    cy.contains(`Hello, ${"Bob"}`).should('be.visible');

    // Step 4: Logout after login
    cy.get('[data-test="logout"]').click();
    cy.url().should('include', '/signin');
  });
});
