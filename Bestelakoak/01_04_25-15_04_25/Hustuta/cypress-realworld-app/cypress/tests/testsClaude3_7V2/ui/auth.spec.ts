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
        
        // Verify we were redirected to the signin page
        cy.location("pathname").should("equal", "/signin");
        cy.getBySel("signin-title").should("be.visible");
    });
    
    it("should redirect to the home page after login", () => {
        // Visit the signin page
        cy.visit("/signin");
        
        // Login with valid credentials
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        
        // Wait for login process to complete
        cy.get("[data-test='sidenav']").should("be.visible");
        
        // Verify we were redirected to the home page
        cy.location("pathname").should("equal", "/");
    });
    
    it("should remember a user for 30 days after login", () => {
        // Visit the signin page
        cy.visit("/signin");
        
        // Login with valid credentials and the "remember me" option checked
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-remember-me").find("input").check();
        cy.getBySel("signin-submit").click();
        
        // Wait for login to complete
        cy.get("[data-test='sidenav']").should("be.visible");
        
        // Verify localStorage contains the auth token and it's not session-based
        cy.window().then((window) => {
            const authData = window.localStorage.getItem("authState");
            expect(authData).to.not.be.null;
        });
    });
    
    it("should allow a visitor to sign-up, login, and logout", () => {
        // Visit the signup page
        cy.visit("/signup");
        
        // Fill in signup form with new user information
        cy.getBySel("signup-first-name").type("Bob");
        cy.getBySel("signup-last-name").type("Ross");
        cy.getBySel("signup-username").type("PainterJoy90");
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-confirmPassword").type("s3cret");
        cy.getBySel("signup-submit").click();
        
        // Wait for the signup API call to complete
        cy.wait("@signup");
        
        // Create a bank account during onboarding
        cy.getBySel("user-onboarding-next").click();
        
        cy.getBySel("bankname-input").type("The Best Bank");
        cy.getBySel("routing-input").type("987654321");
        cy.getBySel("account-input").type("123456789");
        cy.getBySel("submit-bank-form").click();
        
        // Wait for bank account creation
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Complete onboarding
        cy.getBySel("user-onboarding-next").click();
        
        // Verify we're logged in
        cy.get("[data-test='sidenav']").should("be.visible");
        cy.getBySel("sidenav-username").should("contain", "PainterJoy90");
        
        // Logout
        cy.getBySel("sidenav-signout").click();
        
        // Verify we're logged out and back at the signin page
        cy.location("pathname").should("equal", "/signin");
    });
    
    it("should display login errors", () => {
        cy.visit("/signin");
        
        // Submit without entering any data
        cy.getBySel("signin-submit").click();
        
        // Verify error messages are displayed
        cy.getBySel("signin-username").should("have.class", "Mui-error");
        cy.getBySel("signin-password").should("have.class", "Mui-error");
        cy.get(".MuiFormHelperText-root").should("be.visible");
    });
    
    it("should display signup errors", () => {
        cy.visit("/signup");
        
        // Submit without entering any data
        cy.getBySel("signup-submit").click();
        
        // Verify error messages are displayed
        cy.getBySel("signup-first-name").should("have.class", "Mui-error");
        cy.getBySel("signup-last-name").should("have.class", "Mui-error");
        cy.getBySel("signup-username").should("have.class", "Mui-error");
        cy.getBySel("signup-password").should("have.class", "Mui-error");
        cy.getBySel("signup-confirmPassword").should("have.class", "Mui-error");
        cy.get(".MuiFormHelperText-root").should("be.visible");
    });
    
    it("should error for an invalid user", () => {
        cy.visit("/signin");
        
        // Login with an invalid username
        cy.getBySel("signin-username").type("invalidUserName");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        
        // Verify error message is displayed
        cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
    });
    
    it("should error for an invalid password for existing user", () => {
        cy.visit("/signin");
        
        // Login with a valid username but invalid password
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("invalidPa$$word");
        cy.getBySel("signin-submit").click();
        
        // Verify error message is displayed
        cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
    });
});
