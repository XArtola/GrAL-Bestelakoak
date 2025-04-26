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
    // should redirect unauthenticated user to signin page
    it("should redirect unauthenticated user to signin page", () => {
        // Attempt to visit protected home page without authentication
        cy.visit('/home');
        // Assert user is redirected to signin
        cy.url().should('include', '/signin');
    });
    // should redirect to the home page after login
    it("should redirect to the home page after login", () => {
        // Visit signin page
        cy.visit('/signin');
        // Fill in login form
        cy.get('input[name="username"]').type(userInfo.username);
        cy.get('input[name="password"]').type(userInfo.password);
        cy.get('button[type="submit"]').click();
        // Assert redirected to home
        cy.url().should('include', '/home');
    });
    // should remember a user for 30 days after login
    it("should remember a user for 30 days after login", () => {
        // Login
        cy.visit('/signin');
        cy.get('input[name="username"]').type(userInfo.username);
        cy.get('input[name="password"]').type(userInfo.password);
        cy.get('button[type="submit"]').click();
        // Check remember-me cookie or localStorage
        cy.getCookie('rememberMe').should('exist').and((cookie) => {
            expect(cookie.expiry).to.be.gte(Math.floor(Date.now()/1000) + 30 * 24 * 60 * 60);
        });
    });
    // should allow a visitor to sign-up, login, and logout
    it("should allow a visitor to sign-up, login, and logout", () => {
        // Visit signup page
        cy.visit('/signup');
        // Fill signup form
        cy.get('input[name="firstName"]').type(userInfo.firstName);
        cy.get('input[name="lastName"]').type(userInfo.lastName);
        cy.get('input[name="username"]').type(userInfo.username);
        cy.get('input[name="password"]').type(userInfo.password);
        cy.get('button[type="submit"]').click();
        // Assert signup request was made and navigated to home
        cy.wait('@signup');
        cy.url().should('include', '/home');
        // Logout
        cy.get('button[aria-label="logout"]').click();
        cy.url().should('include', '/signin');
    });
    // should display login errors
    it("should display login errors", () => {
        cy.visit('/signin');
        // Submit empty form to trigger errors
        cy.get('button[type="submit"]').click();
        cy.contains('Username is required').should('be.visible');
        cy.contains('Password is required').should('be.visible');
        // Use invalid credentials
        cy.get('input[name="username"]').type(loginCredentials.invalidUsername);
        cy.get('input[name="password"]').type(loginCredentials.invalidPassword);
        cy.get('button[type="submit"]').click();
        cy.contains('Invalid username or password').should('be.visible');
    });
    // should display signup errors
    it("should display signup errors", () => {
        cy.visit('/signup');
        // Submit empty form
        cy.get('button[type="submit"]').click();
        cy.contains('First name is required').should('be.visible');
        cy.contains('Last name is required').should('be.visible');
        cy.contains('Username is required').should('be.visible');
        cy.contains('Password is required').should('be.visible');
    });
    // should error for an invalid user
    it("should error for an invalid user", () => {
        cy.visit('/signin');
        cy.get('input[name="username"]').type(loginCredentials.invalidUsername);
        cy.get('input[name="password"]').type(userInfo.password);
        cy.get('button[type="submit"]').click();
        cy.contains('User not found').should('be.visible');
    });
    // should error for an invalid password for existing user
    it("should error for an invalid password for existing user", () => {
        cy.visit('/signin');
        cy.get('input[name="username"]').type(userInfo.username);
        cy.get('input[name="password"]').type(loginCredentials.anotherInvalidPassword);
        cy.get('button[type="submit"]').click();
        cy.contains('Invalid username or password').should('be.visible');
    });
});
