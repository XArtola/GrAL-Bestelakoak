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
        // Try to access a protected page
        cy.visit("/personal");
        
        // Should be redirected to the signin page
        cy.location("pathname").should("equal", "/signin");
        cy.visualSnapshot("Redirect to SignIn");
    });
    
    it("should redirect to the home page after login", () => {
        // Visit the login page
        cy.visit("/signin");
        
        // Enter valid credentials (using test-info data)
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        
        // Submit the form
        cy.getBySel("signin-submit").click();
        
        // Should be redirected to the home page
        cy.location("pathname").should("equal", "/");
        cy.visualSnapshot("Redirect to Home");
    });
    
    it("should remember a user for 30 days after login", () => {
        // Visit the login page
        cy.visit("/signin");
        
        // Enter valid credentials
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-remember-me").check();
        
        // Submit the form
        cy.getBySel("signin-submit").click();
        
        // Verify login succeeded
        cy.location("pathname").should("equal", "/");
        
        // Verify the cookie has a long expiration date (30 days)
        cy.getCookie("connect.sid").then(cookie => {
            const cookieExpirationDate = new Date(cookie!.expiry! * 1000);
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.setDate(now.getDate() + 30));
            
            // The cookie should expire approximately 30 days from now (give or take a day for timing)
            const daysDifference = Math.round((cookieExpirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            expect(daysDifference).to.be.closeTo(30, 1);
        });
    });
    
    it("should allow a visitor to sign-up, login, and logout", () => {
        // Visit the signup page
        cy.visit("/signup");
        
        // Fill out the sign-up form with user information
        cy.getBySel("signup-first-name").type("Bob");
        cy.getBySel("signup-last-name").type("Ross");
        cy.getBySel("signup-username").type("PainterJoy90");
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-confirmPassword").type("s3cret");
        
        // Submit the form
        cy.getBySel("signup-submit").click();
        
        // Wait for signup request to complete
        cy.wait("@signup");
        
        // Should be redirected to the onboarding page
        cy.location("pathname").should("equal", "/");
        
        // Create a bank account during onboarding
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
        cy.wait("@gqlCreateBankAccountMutation");
        
        // Complete onboarding
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("user-onboarding-done").click();
        
        // Verify logged-in state
        cy.getBySel("sidenav-user-full-name").should("contain", "Bob Ross");
        
        // Logout
        cy.getBySel("sidenav-signout").click();
        
        // Verify logged-out state - should be redirected to signin page
        cy.location("pathname").should("equal", "/signin");
    });
    
    it("should display login errors", () => {
        // Visit the signin page
        cy.visit("/signin");
        
        // Submit the empty form
        cy.getBySel("signin-submit").click();
        
        // Verify validation errors
        cy.getBySel("signin-username").should("have.class", "Mui-error");
        cy.getBySel("signin-password").should("have.class", "Mui-error");
        
        // Enter an invalid username
        cy.getBySel("signin-username").type("invalidUserName");
        cy.getBySel("signin-password").type("invalidPa$$word");
        cy.getBySel("signin-submit").click();
        
        // Verify error message
        cy.getBySel("signin-error")
            .should("be.visible")
            .and("have.text", "Username or password is invalid");
    });
    
    it("should display signup errors", () => {
        // Visit the signup page
        cy.visit("/signup");
        
        // Submit the empty form
        cy.getBySel("signup-submit").click();
        
        // Verify validation errors for all fields
        cy.getBySel("signup-first-name").should("have.class", "Mui-error");
        cy.getBySel("signup-last-name").should("have.class", "Mui-error");
        cy.getBySel("signup-username").should("have.class", "Mui-error");
        cy.getBySel("signup-password").should("have.class", "Mui-error");
        cy.getBySel("signup-confirmPassword").should("have.class", "Mui-error");
        
        // Enter a short password
        cy.getBySel("signup-first-name").type("Bob");
        cy.getBySel("signup-last-name").type("Ross");
        cy.getBySel("signup-username").type("PainterJoy90");
        cy.getBySel("signup-password").type("123");
        cy.getBySel("signup-confirmPassword").type("123");
        cy.getBySel("signup-submit").click();
        
        // Verify password length error
        cy.contains("Password must contain at least 4 characters").should("be.visible");
        
        // Enter mismatched passwords
        cy.getBySel("signup-password").clear().type("s3cret");
        cy.getBySel("signup-confirmPassword").clear().type("different");
        cy.getBySel("signup-submit").click();
        
        // Verify password match error
        cy.contains("Password does not match").should("be.visible");
    });
    
    it("should error for an invalid user", () => {
        // Visit signin page
        cy.visit("/signin");
        
        // Try to login with an invalid username
        cy.getBySel("signin-username").type("invalidUserName");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        
        // Verify error message
        cy.getBySel("signin-error")
            .should("be.visible")
            .and("have.text", "Username or password is invalid");
    });
    
    it("should error for an invalid password for existing user", () => {
        // Visit signin page
        cy.visit("/signin");
        
        // Try to login with a valid username but invalid password
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("INVALID");
        cy.getBySel("signin-submit").click();
        
        // Verify error message
        cy.getBySel("signin-error")
            .should("be.visible")
            .and("have.text", "Username or password is invalid");
    });
});
