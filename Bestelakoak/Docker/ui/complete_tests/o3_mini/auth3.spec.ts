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
    it('should remember a user for 30 days after login', () => {
    // Test: should remember a user for 30 days after login

    // Using provided user information
    const userInfo = {
        firstName: "Bob",
        lastName: "Ross",
        username: "PainterJoy90",
        password: "s3cret"
    };

    // 1. Sign-up steps
    // Visit the sign-up page and fill in the registration form.
    cy.visit("/signup");
    cy.get('[data-test="signup-firstName"]').type("Bob");
    cy.get('[data-test="signup-lastName"]').type("Ross");
    cy.get('[data-test="signup-username"]').type("PainterJoy90");
    cy.get('[data-test="signup-password"]').type("s3cret");
    cy.get('[data-test="signup-submit"]').click();

    // Wait for the sign-up request to complete.
    cy.wait("@signup");

    // 2. Login steps with "Remember Me" checked for persistent session
    cy.visit("/login");
    cy.get('[data-test="login-username"]').type("PainterJoy90");
    cy.get('[data-test="login-password"]').type("s3cret");
    // Check the "Remember Me" option (assumes a corresponding selector).
    cy.get('[data-test="login-remember"]').check();
    cy.get('[data-test="login-submit"]').click();

    // 3. Verify successful login by checking that the dashboard is visible.
    // Adjust the URL/path or selector based on your app's behavior.
    cy.url().should("not.include", "/login");
    cy.get('[data-test="dashboard"]').should("be.visible");

    // 4. Validate that a persistent session cookie is set with an expiration near 30 days.
    // This assumes your app sets a "session" cookie with expiry as a Unix timestamp.
    cy.getCookie("session").should("exist").then((cookie) => {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
        // Allow a tolerance of +/-1 day.
        expect(cookie.expiry).to.be.within(nowInSeconds + 29 * 24 * 60 * 60, nowInSeconds + 31 * 24 * 60 * 60);
    });
  });
});
