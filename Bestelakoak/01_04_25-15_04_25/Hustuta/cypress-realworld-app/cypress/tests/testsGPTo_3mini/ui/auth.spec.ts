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
        // Visit a protected page and confirm redirection to sign in
        cy.visit("/protected");
        cy.url().should("include", "/signin");
    });
    it("should redirect to the home page after login", () => {
        // Visit signin page, fill in PainterJoy90 credentials and submit
        cy.visit("/signin");
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("s3cret");
        cy.get("button[type='submit']").click();
        cy.url().should("include", "/");
    });
    it("should remember a user for 30 days after login", () => {
        // On signin page, check "remember me" then submit and check cookie persists
        cy.visit("/signin");
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("s3cret");
        cy.get("input[name='remember']").check();
        cy.get("button[type='submit']").click();
        cy.getCookie("rememberToken").should("exist");
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        // Visit signup, fill in details and submit
        cy.visit("/signup");
        cy.get("input[name='firstName']").type("Bob");
        cy.get("input[name='lastName']").type("Ross");
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("s3cret");
        cy.get("button[type='submit']").click();
        // After successful signup, log out and verify redirection to signin
        cy.getBySel("sidenav-signout").click();
        cy.url().should("include", "/signin");
    });
    it("should display login errors", () => {
        // Try submitting empty signin form and verify error messages
        cy.visit("/signin");
        cy.get("button[type='submit']").click();
        cy.contains("Username is required").should("be.visible");
        cy.contains("Enter your password").should("be.visible");
    });
    it("should display signup errors", () => {
        // Submit empty signup form and assert error messages appear
        cy.visit("/signup");
        cy.get("button[type='submit']").click();
        cy.contains("First Name is required").should("be.visible");
        cy.contains("Last Name is required").should("be.visible");
        cy.contains("Username is required").should("be.visible");
        cy.contains("Enter your password").should("be.visible");
    });
    it("should error for an invalid user", () => {
        // Attempt signin with invalid username
        cy.visit("/signin");
        cy.get("input[name='username']").type("invalidUserName");
        cy.get("input[name='password']").type("s3cret");
        cy.get("button[type='submit']").click();
        cy.contains("User does not exist").should("be.visible");
    });
    it("should error for an invalid password for existing user", () => {
        // Use valid username but an invalid password
        cy.visit("/signin");
        cy.get("input[name='username']").type("PainterJoy90");
        cy.get("input[name='password']").type("invalidPa$$word");
        cy.get("button[type='submit']").click();
        cy.contains("Invalid password").should("be.visible");
    });
});
