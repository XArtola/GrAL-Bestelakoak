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
    // using user info: firstName: "Bob", lastName: "Ross", username: "PainterJoy90", password: "s3cret"
    it("should redirect unauthenticated user to signin page", () => {
        // Visit a protected page and check redirection to signin
        cy.visit("/protected");
        cy.url().should("include", "/signin");
    });
    it("should redirect to the home page after login", () => {
        // Sign in with valid credentials then expect home page URL
        cy.visit("/signin");
        cy.get('input[name="username"]').type("PainterJoy90");
        cy.get('input[name="password"]').type("s3cret");
        cy.get("form").submit();
        cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
    it("should remember a user for 30 days after login", () => {
        // Login and verify persistence (e.g. a "rememberMe" flag stored in localStorage)
        cy.visit("/signin");
        cy.get('input[name="username"]').type("PainterJoy90");
        cy.get('input[name="password"]').type("s3cret");
        cy.get("form").submit();
        cy.window().then(win => {
           expect(win.localStorage.getItem("rememberMe")).to.exist;
        });
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        // Complete signup
        cy.visit("/signup");
        cy.get('input[name="firstName"]').type("Bob");
        cy.get('input[name="lastName"]').type("Ross");
        cy.get('input[name="username"]').type("PainterJoy90");
        cy.get('input[name="password"]').type("s3cret");
        cy.get("form").submit();
        cy.url().should("eq", Cypress.config().baseUrl + "/");
        // Logout and confirm redirection to signin page
        cy.getBySel("logout-button").click();
        cy.url().should("include", "/signin");
    });
    it("should display login errors", () => {
        // Attempt login with an incorrect password and assert error message is visible
        cy.visit("/signin");
        cy.get('input[name="username"]').type("PainterJoy90");
        cy.get('input[name="password"]').type("wrongPassword");
        cy.get("form").submit();
        cy.getBySel("error-message").should("contain", "Invalid credentials");
    });
    it("should display signup errors", () => {
        // Submit the signup form with missing required fields and check for error messages
        cy.visit("/signup");
        cy.get('input[name="firstName"]').clear();
        cy.get("form").submit();
        cy.getBySel("error-message").should("contain", "First name is required");
    });
    it("should error for an invalid user", () => {
        // Try to log in with a non-existent username and assert error is shown
        cy.visit("/signin");
        cy.get('input[name="username"]').type("NonExistentUser");
        cy.get('input[name="password"]').type("anyPassword");
        cy.get("form").submit();
        cy.getBySel("error-message").should("contain", "User not found");
    });
    it("should error for an invalid password for existing user", () => {
        // Log in with the correct username but wrong password and assert error message
        cy.visit("/signin");
        cy.get('input[name="username"]').type("PainterJoy90");
        cy.get('input[name="password"]').type("INVALID");
        cy.get("form").submit();
        cy.getBySel("error-message").should("contain", "Incorrect password");
    });
});
