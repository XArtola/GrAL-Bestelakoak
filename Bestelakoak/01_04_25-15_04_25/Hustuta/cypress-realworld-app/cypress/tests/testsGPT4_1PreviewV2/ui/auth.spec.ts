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
        // should redirect unauthenticated user to signin page
        cy.visit("/");
        cy.url().should("include", "/signin");
    });
    it("should redirect to the home page after login", () => {
        // should redirect to the home page after login
        cy.visit("/signin");
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        cy.url().should("eq", `${Cypress.config().baseUrl}/`);
        cy.getBySel("sidenav-username").should("contain", "PainterJoy90");
    });
    it("should remember a user for 30 days after login", () => {
        // should remember a user for 30 days after login
        cy.visit("/signin");
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-remember").check();
        cy.getBySel("signin-submit").click();
        cy.url().should("eq", `${Cypress.config().baseUrl}/`);
        cy.clearCookies();
        cy.reload();
        cy.getBySel("sidenav-username").should("contain", "PainterJoy90");
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        // should allow a visitor to sign-up, login, and logout
        cy.visit("/signup");
        cy.getBySel("signup-first-name").type("Bob");
        cy.getBySel("signup-last-name").type("Ross");
        cy.getBySel("signup-username").type("PainterJoy90");
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-confirmPassword").type("s3cret");
        cy.getBySel("signup-submit").click();
        cy.wait("@signup");
        cy.url().should("include", "/signin");
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        cy.getBySel("sidenav-username").should("contain", "PainterJoy90");
        cy.getBySel("sidenav-signout").click();
        cy.url().should("include", "/signin");
    });
    it("should display login errors", () => {
        // should display login errors
        cy.visit("/signin");
        cy.getBySel("signin-username").type("invalidUserName");
        cy.getBySel("signin-password").type("invalidPa$$word");
        cy.getBySel("signin-submit").click();
        cy.getBySel("signin-error").should("be.visible");
    });
    it("should display signup errors", () => {
        // should display signup errors
        cy.visit("/signup");
        cy.getBySel("signup-first-name").type("Bob");
        cy.getBySel("signup-last-name").type("Ross");
        cy.getBySel("signup-username").type("PainterJoy90");
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-confirmPassword").type("INVALID");
        cy.getBySel("signup-submit").click();
        cy.getBySel("signup-error").should("be.visible");
    });
    it("should error for an invalid user", () => {
        // should error for an invalid user
        cy.visit("/signin");
        cy.getBySel("signin-username").type("invalidUserName");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        cy.getBySel("signin-error").should("be.visible");
    });
    it("should error for an invalid password for existing user", () => {
        // should error for an invalid password for existing user
        cy.visit("/signin");
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("INVALID");
        cy.getBySel("signin-submit").click();
        cy.getBySel("signin-error").should("be.visible");
    });
});
