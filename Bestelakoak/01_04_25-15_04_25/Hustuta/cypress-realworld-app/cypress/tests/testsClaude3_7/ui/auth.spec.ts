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
        // Visit the root URL
        cy.visit("/");

        // Check that we're redirected to the signin page
        cy.url().should("include", "/signin");
        
        // Verify signin page elements are visible
        cy.get("[data-test=signin-title]").should("be.visible");
        cy.get("[data-test=signin-username]").should("be.visible");
        cy.get("[data-test=signin-password]").should("be.visible");
        cy.get("[data-test=signin-submit]").should("be.visible");
    });
    it("should redirect to the home page after login", () => {
        // Visit signin page
        cy.visit("/signin");
        
        // Enter valid credentials using userInfo
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        
        // Submit the form
        cy.get("[data-test=signin-submit]").click();
        
        // Verify redirection to home page
        cy.url().should("not.include", "/signin");
        cy.get("[data-test=app-name-logo]").should("be.visible");
        cy.get("[data-test=sidenav]").should("be.visible");
        cy.get("[data-test=user-full-name]").should("be.visible");
    });
    it("should remember a user for 30 days after login", () => {
        // Visit signin page
        cy.visit("/signin");
        
        // Enter valid credentials
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        
        // Check "Remember me" option
        cy.get("[data-test=signin-remember-me]").check();
        
        // Submit the form
        cy.get("[data-test=signin-submit]").click();
        
        // Verify successful login
        cy.url().should("not.include", "/signin");
        
        // Verify local storage contains auth token with expiration
        cy.getAllLocalStorage().then((result) => {
            const authData = JSON.parse(result[Cypress.config().baseUrl].authData);
            expect(authData).to.have.property("username", "PainterJoy90");
            
            // Check that expiry is set to around 30 days (2592000000 ms)
            // Allow some tolerance in the comparison
            const now = new Date().getTime();
            const expiresAt = authData.expiresAt;
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            
            // Verify that expiry is within reasonable range of 30 days
            expect(expiresAt - now).to.be.greaterThan(thirtyDaysInMs - 60000); // Allow 1 minute tolerance
        });
        
        // Reload the page to verify persistence
        cy.reload();
        
        // User should still be logged in
        cy.get("[data-test=sidenav]").should("be.visible");
        cy.get("[data-test=user-full-name]").should("be.visible");
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        // Visit signup page
        cy.visit("/signup");
        
        // Fill the signup form with user information
        cy.get("[data-test=signup-first-name]").type("Bob");
        cy.get("[data-test=signup-last-name]").type("Ross");
        cy.get("[data-test=signup-username]").type("PainterJoy90");
        cy.get("[data-test=signup-password]").type("s3cret");
        cy.get("[data-test=signup-confirmPassword]").type("s3cret");
        
        // Submit the signup form
        cy.get("[data-test=signup-submit]").click();
        
        // Wait for signup process to complete
        cy.wait("@signup");
        
        // Create a bank account
        cy.get("[data-test=bankaccount-bankName-input]").type("The Best Bank");
        cy.get("[data-test=bankaccount-routingNumber-input]").type("987654321");
        cy.get("[data-test=bankaccount-accountNumber-input]").type("123456789");
        cy.get("[data-test=bankaccount-submit]").click();
        
        // Wait for bank account creation to complete
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Finish onboarding
        cy.get("[data-test=user-onboarding-next]").click();
        
        // Verify we're on the home page
        cy.get("[data-test=sidenav]").should("be.visible");
        
        // Log out
        cy.get("[data-test=sidenav-signout]").click();
        
        // Verify we're redirected to the signin page
        cy.url().should("include", "/signin");
        
        // Log back in with the created account
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        
        // Verify successful login
        cy.get("[data-test=sidenav]").should("be.visible");
        cy.get("[data-test=user-full-name]").should("be.visible");
    });
    it("should display login errors", () => {
        // Visit signin page
        cy.visit("/signin");
        
        // Submit the form without entering any credentials
        cy.get("[data-test=signin-submit]").click();
        
        // Verify error messages for required fields
        cy.get("[data-test=signin-username] + div").should("be.visible")
          .and("contain", "Username is required");
        cy.get("[data-test=signin-password] + div").should("be.visible")
          .and("contain", "Password is required");
        
        // Submit with username but no password
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-submit]").click();
        
        // Verify only password error remains
        cy.get("[data-test=signin-username] + div").should("not.exist");
        cy.get("[data-test=signin-password] + div").should("be.visible")
          .and("contain", "Password is required");
    });
    it("should display signup errors", () => {
        // Visit signup page
        cy.visit("/signup");
        
        // Submit the form without entering any information
        cy.get("[data-test=signup-submit]").click();
        
        // Verify error messages for required fields
        cy.get("[data-test=signup-first-name] + div").should("be.visible")
          .and("contain", "First Name is required");
        cy.get("[data-test=signup-last-name] + div").should("be.visible")
          .and("contain", "Last Name is required");
        cy.get("[data-test=signup-username] + div").should("be.visible")
          .and("contain", "Username is required");
        cy.get("[data-test=signup-password] + div").should("be.visible");
        cy.get("[data-test=signup-confirmPassword] + div").should("be.visible");
        
        // Test password mismatch error
        cy.get("[data-test=signup-first-name]").type("Bob");
        cy.get("[data-test=signup-last-name]").type("Ross");
        cy.get("[data-test=signup-username]").type("PainterJoy90");
        cy.get("[data-test=signup-password]").type("s3cret");
        cy.get("[data-test=signup-confirmPassword]").type("different");
        cy.get("[data-test=signup-submit]").click();
        
        // Verify password mismatch error
        cy.get("[data-test=signup-confirmPassword] + div").should("be.visible")
          .and("contain", "Password does not match");
    });
    it("should error for an invalid user", () => {
        // Visit signin page
        cy.visit("/signin");
        
        // Try to log in with invalid username
        cy.get("[data-test=signin-username]").type("invalidUserName");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        
        // Verify error message
        cy.get("[data-test=signin-error]").should("be.visible")
          .and("contain", "Username or password is invalid");
    });
    it("should error for an invalid password for existing user", () => {
        // Visit signin page
        cy.visit("/signin");
        
        // Try to log in with valid username but invalid password
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("invalidPa$$word");
        cy.get("[data-test=signin-submit]").click();
        
        // Verify error message
        cy.get("[data-test=signin-error]").should("be.visible")
          .and("contain", "Username or password is invalid");
    });
});
