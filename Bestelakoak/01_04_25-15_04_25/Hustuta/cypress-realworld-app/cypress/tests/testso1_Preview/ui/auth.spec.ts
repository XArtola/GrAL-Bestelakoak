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
        // 1. Try visiting a protected page
        cy.visit("/transactions");
        // 2. Assert that the user is redirected to sign in
        cy.url().should("include", "/signin");
    });
    it("should redirect to the home page after login", () => {
        // 1. Go to the sign-in page
        cy.visit("/signin");
        // 2. Enter existing user credentials
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("s3cret");
        cy.get("button[type='submit']").click();
        // 3. Assert that we're redirected to the home page
        cy.url().should("include", "/");
    });
    it("should remember a user for 30 days after login", () => {
        // 1. Visit sign-in and check "remember me" option
        cy.visit("/signin");
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("s3cret");
        cy.get("input[name='remember']").check();
        cy.get("button[type='submit']").click();
        // 2. Confirm cookie is set to persist for 30 days
        cy.getCookie("rememberToken").should("exist");
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        // 1. Visit sign-up page
        cy.visit("/signup");
        // 2. Fill in new user info
        cy.get("input[name='firstName']").type("Bob");
        cy.get("input[name='lastName']").type("Ross");
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("s3cret");
        cy.get("button[type='submit']").click();
        // 3. Log out
        cy.getBySel("sidenav-signout").click();
        // 4. Assert user is logged out
        cy.url().should("include", "/signin");
    });
    it("should display login errors", () => {
        // 1. Visit sign-in
        cy.visit("/signin");
        // 2. Submit empty form
        cy.get("button[type='submit']").click();
        // 3. Assert visible errors for username and password
        cy.contains("Username is required").should("be.visible");
        cy.contains("Password is required").should("be.visible");
    });
    it("should display signup errors", () => {
        // 1. Visit sign-up
        cy.visit("/signup");
        // 2. Submit empty form
        cy.get("button[type='submit']").click();
        // 3. Assert visible errors for required fields
        cy.contains("First name is required").should("be.visible");
        cy.contains("Last name is required").should("be.visible");
        cy.contains("Username is required").should("be.visible");
        cy.contains("Password is required").should("be.visible");
    });
    it("should error for an invalid user", () => {
        // Use invalid username
        cy.visit("/signin");
        cy.get("input[name='username']").type("invalidUserName");
        cy.get("input[name='password']").type("s3cret");
        cy.get("button[type='submit']").click();
        // Assert error message
        cy.contains("User does not exist").should("be.visible");
    });
    it("should error for an invalid password for existing user", () => {
        // Use valid username but invalid password
        cy.visit("/signin");
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("invalidPa$$word");
        cy.get("button[type='submit']").click();
        // Assert error message
        cy.contains("Invalid password").should("be.visible");
    });
});
