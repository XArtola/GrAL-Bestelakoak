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

    // Test: Redirect unauthenticated user to signin page
    it("should redirect unauthenticated user to signin page", () => {
        // <generated_code>
        cy.visit("/"); // Visit the home page
        cy.url().should("include", "/signin"); // Assert redirection to signin page
        // </generated_code>
    });

    // Test: Redirect to the home page after login
    it("should redirect to the home page after login", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        cy.url().should("include", "/"); // Assert redirection to home page
        // </generated_code>
    });

    // Test: Remember a user for 30 days after login
    it("should remember a user for 30 days after login", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-remember-me]").check(); // Check "Remember me" option
        cy.get("[data-test=signin-submit]").click();
        cy.getCookie("connect.sid").should("have.property", "expiry"); // Assert cookie expiry is set
        // </generated_code>
    });

    // Test: Allow a visitor to sign-up, login, and logout
    it("should allow a visitor to sign-up, login, and logout", () => {
        // <generated_code>
        cy.visit("/signup");
        cy.get("[data-test=signup-first-name]").type("Bob");
        cy.get("[data-test=signup-last-name]").type("Ross");
        cy.get("[data-test=signup-username]").type("PainterJoy90");
        cy.get("[data-test=signup-password]").type("s3cret");
        cy.get("[data-test=signup-confirmPassword]").type("s3cret");
        cy.get("[data-test=signup-submit]").click();
        cy.wait("@signup");
        cy.url().should("include", "/signin"); // Assert redirection to signin page

        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        cy.url().should("include", "/"); // Assert redirection to home page

        cy.get("[data-test=sidenav-signout]").click(); // Logout
        cy.url().should("include", "/signin"); // Assert redirection to signin page
        // </generated_code>
    });

    // Test: Display login errors
    it("should display login errors", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("invalidUserName");
        cy.get("[data-test=signin-password]").type("invalidPa$$word");
        cy.get("[data-test=signin-submit]").click();
        cy.get("[data-test=signin-error]").should("be.visible").and("contain", "Username or password is invalid");
        // </generated_code>
    });

    // Test: Display signup errors
    it("should display signup errors", () => {
        // <generated_code>
        cy.visit("/signup");
        cy.get("[data-test=signup-first-name]").type("Bob");
        cy.get("[data-test=signup-last-name]").type("Ross");
        cy.get("[data-test=signup-username]").type("PainterJoy90");
        cy.get("[data-test=signup-password]").type("s3cret");
        cy.get("[data-test=signup-confirmPassword]").type("INVALID"); // Mismatched password
        cy.get("[data-test=signup-submit]").click();
        cy.get("[data-test=signup-error]").should("be.visible").and("contain", "Password does not match");
        // </generated_code>
    });

    // Test: Error for an invalid user
    it("should error for an invalid user", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("invalidUserName");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        cy.get("[data-test=signin-error]").should("be.visible").and("contain", "Username or password is invalid");
        // </generated_code>
    });

    // Test: Error for an invalid password for existing user
    it("should error for an invalid password for existing user", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("invalidPa$$word");
        cy.get("[data-test=signin-submit]").click();
        cy.get("[data-test=signin-error]").should("be.visible").and("contain", "Username or password is invalid");
        // </generated_code>
    });
});
