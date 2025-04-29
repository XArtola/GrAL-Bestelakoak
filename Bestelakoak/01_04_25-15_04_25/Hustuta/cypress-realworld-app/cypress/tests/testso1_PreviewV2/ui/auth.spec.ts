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
        // Attempt to visit a protected page
        cy.visit("/personal");

        // Confirm that we are redirected to the sign-in page
        cy.url().should("include", "/signin");
    });
    it("should redirect to the home page after login", () => {
        // Visit the sign-in page
        cy.visit("/signin");

        // Fill in valid username and password
        cy.get("#username").type("PainterJoy90");
        cy.get("#password").type("s3cret");
        cy.get('button[type="submit"]').click();

        // Check that we're redirected to the home page
        cy.url().should("eq", "http://localhost:3000/");
    });
    it("should remember a user for 30 days after login", () => {
        // Visit sign-in page
        cy.visit("/signin");

        // Enter valid credentials and check 'remember' option
        cy.get("#username").type("PainterJoy90");
        cy.get("#password").type("s3cret");
        cy.get("input[name='remember']").check();
        cy.get('button[type="submit"]').click();

        // Verify successful login and that a session cookie is set
        cy.url().should("eq", "http://localhost:3000/");
        cy.getCookie("connect.sid").should("exist");

        // Checking actual expiration date might require more info
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        // Visit sign-up page
        cy.visit("/signup");

        // Fill in user details for sign-up
        cy.get("#firstName").type("Bob");
        cy.get("#lastName").type("Ross");
        cy.get("#username").type("PainterJoy90");
        cy.get("#password").type("s3cret");
        cy.get("#confirmPassword").type("s3cret");
        cy.get('button[type="submit"]').click();

        // Confirm we're redirected to home page
        cy.url().should("eq", "http://localhost:3000/");

        // Logout
        cy.getBySel("sidenav-signout").click();
        cy.url().should("include", "/signin");
    });
    it("should display login errors", () => {
        // Visit sign-in page
        cy.visit("/signin");

        // Attempt to submit without entering credentials
        cy.get('button[type="submit"]').click();
        cy.contains("Username is required").should("be.visible");

        // Provide username but not password
        cy.get("#username").type("PainterJoy90");
        cy.get('button[type="submit"]').click();
        cy.contains("Password is required").should("be.visible");
    });
    it("should display signup errors", () => {
        // Visit sign-up page
        cy.visit("/signup");

        // Attempt to submit without entering credentials
        cy.get('button[type="submit"]').click();
        cy.contains("First Name is required").should("be.visible");

        // Fill partial data
        cy.get("#firstName").type("Bob");
        cy.get("#lastName").type("Ross");
        cy.get("#username").type("PainterJoy90");
        cy.get('button[type="submit"]').click();
        cy.contains("Password is required").should("be.visible");
    });
    it("should error for an invalid user", () => {
        // Visit sign-in page
        cy.visit("/signin");

        // Enter invalid username
        cy.get("#username").type("invalidUserName");
        cy.get("#password").type("s3cret");
        cy.get('button[type="submit"]').click();

        // Confirm there's an error message
        cy.contains("Incorrect username or password.").should("be.visible");
    });
    it("should error for an invalid password for existing user", () => {
        // Visit sign-in page
        cy.visit("/signin");

        // Enter valid username but invalid password
        cy.get("#username").type("PainterJoy90");
        cy.get("#password").type("invalidPa$$word");
        cy.get('button[type="submit"]').click();

        // Confirm there's an error message
        cy.contains("Incorrect username or password.").should("be.visible");
    });
});
