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
        // Visit a protected route
        cy.visit("/personal");
        
        // Verify redirect to signin page
        cy.url().should("contain", "/signin");
        cy.location("pathname").should("equal", "/signin");
    });

    it("should redirect to the home page after login", () => {
        // Visit signin page
        cy.visit("/signin");

        // Fill in login credentials
        cy.get("[data-test='signin-username']").type("PainterJoy90");
        cy.get("[data-test='signin-password']").type("s3cret");
        cy.get("[data-test='signin-submit']").click();

        // Verify redirect to home page
        cy.url().should("contain", "/");
        cy.location("pathname").should("equal", "/");
    });

    it("should remember a user for 30 days after login", () => {
        // Login
        cy.visit("/signin");
        cy.get("[data-test='signin-username']").type("PainterJoy90");
        cy.get("[data-test='signin-password']").type("s3cret");
        cy.get("[data-test='signin-remember-me']").check();
        cy.get("[data-test='signin-submit']").click();

        // Verify localStorage contains auth token
        cy.window().its("localStorage").invoke("getItem", "authToken").should("exist");
        
        // Verify cookie is set with correct expiration
        cy.getCookie("connect.sid").should("exist");
    });

    it("should allow a visitor to sign-up, login, and logout", () => {
        // Sign up
        cy.visit("/signup");
        cy.get("[data-test='signup-first-name']").type("Bob");
        cy.get("[data-test='signup-last-name']").type("Ross");
        cy.get("[data-test='signup-username']").type("PainterJoy90");
        cy.get("[data-test='signup-password']").type("s3cret");
        cy.get("[data-test='signup-confirmPassword']").type("s3cret");
        cy.get("[data-test='signup-submit']").click();

        // Wait for signup API call
        cy.wait("@signup");

        // Create bank account
        cy.get("[data-test='bankaccount-bankName']").type("The Best Bank");
        cy.get("[data-test='bankaccount-routingNumber']").type("987654321");
        cy.get("[data-test='bankaccount-accountNumber']").type("123456789");
        cy.get("[data-test='bankaccount-submit']").click();

        // Verify logged in state
        cy.get("[data-test='sidenav-user-full-name']").should("contain", "Bob Ross");

        // Logout
        cy.get("[data-test='sidenav-signout']").click();
        cy.url().should("contain", "/signin");
    });

    it("should display login errors", () => {
        cy.visit("/signin");

        // Submit empty form
        cy.get("[data-test='signin-submit']").click();
        cy.get("[data-test='signin-error']").should("be.visible");
        
        // Submit with only username
        cy.get("[data-test='signin-username']").type("PainterJoy90");
        cy.get("[data-test='signin-submit']").click();
        cy.get("[data-test='signin-error']").should("be.visible");
    });

    it("should display signup errors", () => {
        cy.visit("/signup");

        // Submit empty form
        cy.get("[data-test='signup-submit']").click();
        cy.get("[data-test='signup-error']").should("be.visible");

        // Submit mismatched passwords
        cy.get("[data-test='signup-first-name']").type("Bob");
        cy.get("[data-test='signup-last-name']").type("Ross");
        cy.get("[data-test='signup-username']").type("PainterJoy90");
        cy.get("[data-test='signup-password']").type("s3cret");
        cy.get("[data-test='signup-confirmPassword']").type("different");
        cy.get("[data-test='signup-submit']").click();
        cy.get("[data-test='signup-error']").should("be.visible");
    });

    it("should error for an invalid user", () => {
        cy.visit("/signin");
        cy.get("[data-test='signin-username']").type("invalidUserName");
        cy.get("[data-test='signin-password']").type("s3cret");
        cy.get("[data-test='signin-submit']").click();
        cy.get("[data-test='signin-error']")
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });

    it("should error for an invalid password for existing user", () => {
        cy.visit("/signin");
        cy.get("[data-test='signin-username']").type("PainterJoy90");
        cy.get("[data-test='signin-password']").type("invalidPa$$word");
        cy.get("[data-test='signin-submit']").click();
        cy.get("[data-test='signin-error']")
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });
});
