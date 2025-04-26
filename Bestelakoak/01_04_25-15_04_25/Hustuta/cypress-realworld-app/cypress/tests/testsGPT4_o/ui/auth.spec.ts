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
        // <generated_code>
        // Verify redirection to the signin page for unauthenticated users
        cy.visit("/");
        cy.url().should("include", "/signin");
        // </generated_code>
    });

    it("should redirect to the home page after login", () => {
        // <generated_code>
        // Log in and verify redirection to the home page
        cy.visit("/signin");
        cy.get("#username").type(userInfo.username);
        cy.get("#password").type(userInfo.password);
        cy.get("button[type='submit']").click();
        cy.url().should("include", "/home");
        // </generated_code>
    });

    it("should remember a user for 30 days after login", () => {
        // <generated_code>
        // Log in with 'Remember Me' checked and verify persistence
        cy.visit("/signin");
        cy.get("#username").type(userInfo.username);
        cy.get("#password").type(userInfo.password);
        cy.get("#rememberMe").check();
        cy.get("button[type='submit']").click();
        cy.getCookie("rememberMe").should("exist");
        // </generated_code>
    });

    it("should allow a visitor to sign-up, login, and logout", () => {
        // <generated_code>
        // Sign up, log in, and log out
        cy.visit("/signup");
        cy.get("#firstName").type(userInfo.firstName);
        cy.get("#lastName").type(userInfo.lastName);
        cy.get("#username").type(userInfo.username);
        cy.get("#password").type(userInfo.password);
        cy.get("button[type='submit']").click();
        cy.url().should("include", "/signin");

        cy.get("#username").type(userInfo.username);
        cy.get("#password").type(userInfo.password);
        cy.get("button[type='submit']").click();
        cy.url().should("include", "/home");

        cy.get("#logout").click();
        cy.url().should("include", "/signin");
        // </generated_code>
    });

    it("should display login errors", () => {
        // <generated_code>
        // Attempt login with invalid credentials and verify error messages
        cy.visit("/signin");
        cy.get("#username").type(loginCredentials.invalidUsername);
        cy.get("#password").type(loginCredentials.invalidPassword);
        cy.get("button[type='submit']").click();
        cy.get(".error-message").should("contain", "Invalid username or password");
        // </generated_code>
    });

    it("should display signup errors", () => {
        // <generated_code>
        // Attempt signup with missing fields and verify error messages
        cy.visit("/signup");
        cy.get("#firstName").type(userInfo.firstName);
        cy.get("#lastName").type(userInfo.lastName);
        cy.get("button[type='submit']").click();
        cy.get(".error-message").should("contain", "All fields are required");
        // </generated_code>
    });

    it("should error for an invalid user", () => {
        // <generated_code>
        // Attempt login with a non-existent user and verify error message
        cy.visit("/signin");
        cy.get("#username").type(loginCredentials.invalidUsername);
        cy.get("#password").type(userInfo.password);
        cy.get("button[type='submit']").click();
        cy.get(".error-message").should("contain", "User does not exist");
        // </generated_code>
    });

    it("should error for an invalid password for existing user", () => {
        // <generated_code>
        // Attempt login with an invalid password and verify error message
        cy.visit("/signin");
        cy.get("#username").type(userInfo.username);
        cy.get("#password").type(loginCredentials.anotherInvalidPassword);
        cy.get("button[type='submit']").click();
        cy.get(".error-message").should("contain", "Invalid password");
        // </generated_code>
    });
});
