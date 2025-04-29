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
    // should redirect unauthenticated user to signin page
    it("should redirect unauthenticated user to signin page", () => {
        // <generated_code>
        cy.visit("/");
        cy.url().should("include", "/signin");
        // </generated_code>
    });

    // should redirect to the home page after login
    it("should redirect to the home page after login", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        cy.url().should("eq", "http://localhost:3000/");
        // </generated_code>
    });

    // should remember a user for 30 days after login
    it("should remember a user for 30 days after login", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-remember-me").check();
        cy.getBySel("signin-submit").click();
        cy.getCookie("connect.sid").should("exist");
        // </generated_code>
    });

    // should allow a visitor to sign-up, login, and logout
    it("should allow a visitor to sign-up, login, and logout", () => {
        // <generated_code>
        cy.visit("/signup");
        cy.getBySel("signup-first-name").type("Bob");
        cy.getBySel("signup-last-name").type("Ross");
        cy.getBySel("signup-username").type("NewUser");
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-confirmPassword").type("s3cret");
        cy.getBySel("signup-submit").click();
        cy.url().should("include", "/signin");
        cy.visit("/signin");
        cy.getBySel("signin-username").type("NewUser");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        cy.url().should("eq", "http://localhost:3000/");
        cy.getBySel("sidenav-signout").click();
        cy.url().should("include", "/signin");
        // </generated_code>
    });

    // should display login errors
    it("should display login errors", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.getBySel("signin-username").type("invalidUserName");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        cy.getBySel("signin-error").should("be.visible");
        // </generated_code>
    });

    // should display signup errors
    it("should display signup errors", () => {
       // <generated_code>
        cy.visit("/signup");
        cy.getBySel("signup-username").type("PainterJoy90");
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-submit").click();
        cy.get("div.MuiAlert-message").should('be.visible')
        // </generated_code>
    });

    // should error for an invalid user
    it("should error for an invalid user", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.getBySel("signin-username").type("invalidUserName");
        cy.getBySel("signin-password").type("s3cret");
        cy.getBySel("signin-submit").click();
        cy.getBySel("signin-error").should("be.visible");
        // </generated_code>
    });

    // should error for an invalid password for existing user
    it("should error for an invalid password for existing user", () => {
        // <generated_code>
        cy.visit("/signin");
        cy.getBySel("signin-username").type("PainterJoy90");
        cy.getBySel("signin-password").type("invalidPa$$word");
        cy.getBySel("signin-submit").click();
        cy.getBySel("signin-error").should("be.visible");
        // </generated_code>
    });
});
