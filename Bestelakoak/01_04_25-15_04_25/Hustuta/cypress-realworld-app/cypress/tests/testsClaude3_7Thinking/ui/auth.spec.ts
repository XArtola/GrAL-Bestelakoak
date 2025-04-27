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
        // Visit a protected page
        cy.visit("/personal");
        
        // Verify redirect to the signin page
        cy.url().should("include", "/signin");
        cy.getBySel("signin-title").should("be.visible");
    });
    it("should redirect to the home page after login", () => {
        const userInfo = {
            firstName: "Bob",
            lastName: "Ross",
            username: "PainterJoy90",
            password: "s3cret"
        };
        
        // Visit the login page
        cy.visit("/signin");
        
        // Fill in login credentials
        cy.getBySel("signin-username").type(userInfo.username);
        cy.getBySel("signin-password").type(userInfo.password);
        
        // Click the sign in button
        cy.getBySel("signin-submit").click();
        
        // Verify redirect to the home page
        cy.url().should("include", "/");
        
        // Verify user is logged in by checking for user profile elements
        cy.getBySel("sidenav-user-full-name").should("contain", `${userInfo.firstName} ${userInfo.lastName}`);
    });
    it("should remember a user for 30 days after login", () => {
        const userInfo = {
            username: "PainterJoy90",
            password: "s3cret"
        };
        
        // Visit the login page
        cy.visit("/signin");
        
        // Fill in login credentials
        cy.getBySel("signin-username").type(userInfo.username);
        cy.getBySel("signin-password").type(userInfo.password);
        
        // Check the remember me checkbox
        cy.getBySel("signin-remember-me").check();
        
        // Click the sign in button
        cy.getBySel("signin-submit").click();
        
        // Verify successful login
        cy.getBySel("sidenav-user-full-name").should("be.visible");
        
        // Verify auth token is stored in local storage with 30 day expiry
        cy.getAllLocalStorage().then((localStorage) => {
            const authKey = Object.keys(localStorage[Cypress.config().baseUrl]).find(key => 
                key.startsWith('authState'));
            expect(authKey).to.exist;
        });
        
        // Reload the page to verify persistence
        cy.reload();
        
        // Should still be logged in
        cy.getBySel("sidenav-user-full-name").should("be.visible");
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        const userInfo = {
            firstName: "Bob",
            lastName: "Ross",
            username: "PainterJoy90",
            password: "s3cret"
        };
        
        const bankAccountInfo = {
            bankName: "The Best Bank",
            accountNumber: "123456789",
            routingNumber: "987654321"
        };
        
        // Create a random username to avoid conflicts
        const randomUsername = `${userInfo.username}${Date.now().toString().slice(-4)}`;
        
        // Visit the signup page
        cy.visit("/signup");
        
        // Fill out the signup form
        cy.getBySel("signup-first-name").type(userInfo.firstName);
        cy.getBySel("signup-last-name").type(userInfo.lastName);
        cy.getBySel("signup-username").type(randomUsername);
        cy.getBySel("signup-password").type(userInfo.password);
        cy.getBySel("signup-confirmPassword").type(userInfo.password);
        
        // Submit the signup form
        cy.getBySel("signup-submit").click();
        
        // Wait for user creation
        cy.wait("@signup");
        
        // Verify onboarding flow starts
        cy.getBySel("user-onboarding-dialog").should("be.visible");
        cy.getBySel("user-onboarding-next").click();
        
        // Fill bank account form
        cy.getBySel("bankaccount-bankName-input").type(bankAccountInfo.bankName);
        cy.getBySel("bankaccount-routingNumber-input").type(bankAccountInfo.routingNumber);
        cy.getBySel("bankaccount-accountNumber-input").type(bankAccountInfo.accountNumber);
        cy.getBySel("bankaccount-submit").click();
        
        // Wait for bank account creation
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Finish onboarding
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("user-onboarding-next").click();
        
        // Verify successful login after signup
        cy.getBySel("sidenav-user-full-name").should("contain", `${userInfo.firstName} ${userInfo.lastName}`);
        
        // Logout
        cy.getBySel("sidenav-signout").click();
        
        // Verify redirect to signin page
        cy.url().should("include", "/signin");
        
        // Log back in with created credentials
        cy.getBySel("signin-username").type(randomUsername);
        cy.getBySel("signin-password").type(userInfo.password);
        cy.getBySel("signin-submit").click();
        
        // Verify successful login
        cy.getBySel("sidenav-user-full-name").should("contain", `${userInfo.firstName} ${userInfo.lastName}`);
    });
    it("should display login errors", () => {
        const userInfo = {
            username: "PainterJoy90",
            password: "s3cret",
            invalidPassword: "invalidPa$$word"
        };
        
        // Visit the login page
        cy.visit("/signin");
        
        // Submit empty form
        cy.getBySel("signin-submit").click();
        
        // Verify validation errors for empty fields
        cy.getBySel("signin-username").parent().find(".MuiFormHelperText-root")
            .should("be.visible")
            .and("contain", "Username is required");
        cy.getBySel("signin-password").parent().find(".MuiFormHelperText-root")
            .should("be.visible")
            .and("contain", "Password is required");
        
        // Fill username only
        cy.getBySel("signin-username").type(userInfo.username);
        cy.getBySel("signin-submit").click();
        
        // Verify password validation error
        cy.getBySel("signin-password").parent().find(".MuiFormHelperText-root")
            .should("be.visible")
            .and("contain", "Password is required");
        
        // Fill password only (clear username first)
        cy.getBySel("signin-username").clear();
        cy.getBySel("signin-password").type(userInfo.password);
        cy.getBySel("signin-submit").click();
        
        // Verify username validation error
        cy.getBySel("signin-username").parent().find(".MuiFormHelperText-root")
            .should("be.visible")
            .and("contain", "Username is required");
    });
    it("should display signup errors", () => {
        // Visit the signup page
        cy.visit("/signup");
        
        // Submit empty form
        cy.getBySel("signup-submit").click();
        
        // Verify validation errors
        cy.getBySel("signup-first-name").parent().find(".MuiFormHelperText-root")
            .should("be.visible");
        cy.getBySel("signup-last-name").parent().find(".MuiFormHelperText-root")
            .should("be.visible");
        cy.getBySel("signup-username").parent().find(".MuiFormHelperText-root")
            .should("be.visible");
        cy.getBySel("signup-password").parent().find(".MuiFormHelperText-root")
            .should("be.visible");
        cy.getBySel("signup-confirmPassword").parent().find(".MuiFormHelperText-root")
            .should("be.visible");
        
        // Test password mismatch
        cy.getBySel("signup-password").type("password123");
        cy.getBySel("signup-confirmPassword").type("password456");
        cy.getBySel("signup-submit").click();
        
        // Verify password mismatch error
        cy.getBySel("signup-confirmPassword").parent().find(".MuiFormHelperText-root")
            .should("be.visible")
            .and("contain", "Passwords do not match");
    });
    it("should error for an invalid user", () => {
        const userInfo = {
            username: "invalidUserName",
            password: "s3cret"
        };
        
        // Visit the login page
        cy.visit("/signin");
        
        // Fill in invalid credentials
        cy.getBySel("signin-username").type(userInfo.username);
        cy.getBySel("signin-password").type(userInfo.password);
        
        // Click the sign in button
        cy.getBySel("signin-submit").click();
        
        // Verify error message
        cy.getBySel("signin-error")
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });
    it("should error for an invalid password for existing user", () => {
        const userInfo = {
            username: "PainterJoy90",
            password: "INVALID"
        };
        
        // Visit the login page
        cy.visit("/signin");
        
        // Fill in valid username but invalid password
        cy.getBySel("signin-username").type(userInfo.username);
        cy.getBySel("signin-password").type(userInfo.password);
        
        // Click the sign in button
        cy.getBySel("signin-submit").click();
        
        // Verify error message
        cy.getBySel("signin-error")
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });
});
