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
    it("should redirect unauthenticated user to signin page", () => {
        /* should redirect unauthenticated user to signin page */
        // Attempt to visit a protected page
        cy.visit("/bankaccounts");
        // Should be redirected to sign-in
        cy.url().should("include", "/signin");
        cy.get('[data-test="signin-title"]').should("be.visible");
    });
    it("should redirect to the home page after login", () => {
        /* should redirect to the home page after login */
        // Visit sign-in page
        cy.visit("/signin");
        // Fill in login form
        cy.get('[data-test="signin-username"]')
            .type(userInfo.username);
        cy.get('[data-test="signin-password"]')
            .type(userInfo.password);
        cy.get('[data-test="signin-submit"]').click();
        // Should be redirected to home page
        cy.url().should("eq", `${Cypress.config().baseUrl}/`);
        cy.get('[data-test="sidenav-user-full-name"]').should("contain", `${userInfo.firstName} ${userInfo.lastName}`);
    });
    it("should remember a user for 30 days after login", () => {
        /* should remember a user for 30 days after login */
        cy.visit("/signin");
        cy.get('[data-test="signin-username"]')
            .type(userInfo.username);
        cy.get('[data-test="signin-password"]')
            .type(userInfo.password);
        cy.get('[data-test="signin-remember-me"]')
            .check();
        cy.get('[data-test="signin-submit"]').click();
        cy.url().should("eq", `${Cypress.config().baseUrl}/`);
        // Check that the rememberMe cookie is set for 30 days
        cy.getCookie("rememberMe").should((cookie) => {
            expect(cookie).to.exist;
            expect(cookie.expiry).to.be.greaterThan(Date.now() / 1000 + 60 * 60 * 24 * 29);
        });
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        /* should allow a visitor to sign-up, login, and logout */
        // Sign up
        cy.visit("/signup");
        cy.get('[data-test="signup-first-name"]').type(userInfo.firstName);
        cy.get('[data-test="signup-last-name"]').type(userInfo.lastName);
        cy.get('[data-test="signup-username"]').type(userInfo.username);
        cy.get('[data-test="signup-password"]').type(userInfo.password);
        cy.get('[data-test="signup-confirmPassword"]').type(userInfo.password);
        cy.get('[data-test="signup-submit"]').click();
        // Should be redirected to sign-in
        cy.url().should("include", "/signin");
        // Login
        cy.get('[data-test="signin-username"]').type(userInfo.username);
        cy.get('[data-test="signin-password"]').type(userInfo.password);
        cy.get('[data-test="signin-submit"]').click();
        // Should be redirected to home page
        cy.url().should("eq", `${Cypress.config().baseUrl}/`);
        // Logout
        cy.get('[data-test="sidenav-signout"]').click();
        cy.url().should("include", "/signin");
    });
    it("should display login errors", () => {
        /* should display login errors */
        cy.visit("/signin");
        // Invalid username
        cy.get('[data-test="signin-username"]').type("invalidUserName");
        cy.get('[data-test="signin-password"]').type(userInfo.password);
        cy.get('[data-test="signin-submit"]').click();
        cy.get('[data-test="signin-error"]')
            .should("be.visible")
            .and("contain", "Username or password is invalid");
        // Invalid password
        cy.get('[data-test="signin-username"]').clear().type(userInfo.username);
        cy.get('[data-test="signin-password"]').clear().type("invalidPa$$word");
        cy.get('[data-test="signin-submit"]').click();
        cy.get('[data-test="signin-error"]')
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });
    it("should display signup errors", () => {
        /* should display signup errors */
        cy.visit("/signup");
        // Try to sign up with missing fields
        cy.get('[data-test="signup-submit"]').click();
        cy.get('[data-test="signup-error"]')
            .should("be.visible");
        // Try to sign up with existing username
        cy.get('[data-test="signup-first-name"]').type(userInfo.firstName);
        cy.get('[data-test="signup-last-name"]').type(userInfo.lastName);
        cy.get('[data-test="signup-username"]').type(userInfo.username);
        cy.get('[data-test="signup-password"]').type(userInfo.password);
        cy.get('[data-test="signup-confirmPassword"]').type(userInfo.password);
        cy.get('[data-test="signup-submit"]').click();
        cy.get('[data-test="signup-error"]')
            .should("be.visible")
            .and("contain", "Username already exists");
    });
    it("should error for an invalid user", () => {
        /* should error for an invalid user */
        cy.visit("/signin");
        cy.get('[data-test="signin-username"]').type("invalidUserName");
        cy.get('[data-test="signin-password"]').type(userInfo.password);
        cy.get('[data-test="signin-submit"]').click();
        cy.get('[data-test="signin-error"]')
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });
    it("should error for an invalid password for existing user", () => {
        /* should error for an invalid password for existing user */
        cy.visit("/signin");
        cy.get('[data-test="signin-username"]').type(userInfo.username);
        cy.get('[data-test="signin-password"]').type("INVALID");
        cy.get('[data-test="signin-submit"]').click();
        cy.get('[data-test="signin-error"]')
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });
});
