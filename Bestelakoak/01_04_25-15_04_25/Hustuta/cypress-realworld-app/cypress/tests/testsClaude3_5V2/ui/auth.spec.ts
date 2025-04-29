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
        cy.visit("/personal");
        cy.location("pathname").should("equal", "/signin");
    });

    it("should redirect to the home page after login", () => {
        cy.login("PainterJoy90", "s3cret");
        cy.location("pathname").should("equal", "/");
    });

    it("should remember a user for 30 days after login", () => {
        cy.login("PainterJoy90", "s3cret", { rememberUser: true });
        cy.reload();
        cy.location("pathname").should("not.equal", "/signin");
    });

    it("should allow a visitor to sign-up, login, and logout", () => {
        // Sign up
        cy.visit("/signup");
        cy.getBySel("signup-first-name").type("Bob");  
        cy.getBySel("signup-last-name").type("Ross");
        cy.getBySel("signup-username").type("PainterJoy90");
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-confirmPassword").type("s3cret");
        cy.getBySel("signup-submit").click();
        cy.wait("@signup");

        // Login
        cy.login("PainterJoy90", "s3cret");
        
        // Logout
        cy.getBySel("sidenav-signout").click();
        cy.location("pathname").should("equal", "/signin");
    });

    it("should display login errors", () => {
        cy.visit("/signin");
        cy.getBySel("signin-submit").click();
        cy.get(".MuiAlert-message").should("be.visible");
    });

    it("should display signup errors", () => {
        cy.visit("/signup");
        cy.getBySel("signup-submit").click();
        cy.get(".MuiAlert-message").should("be.visible");
    });

    it("should error for an invalid user", () => {
        cy.login("invalidUserName", "s3cret");
        cy.get(".MuiAlert-message")
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });

    it("should error for an invalid password for existing user", () => {
        cy.login("PainterJoy90", "invalidPa$$word");
        cy.get(".MuiAlert-message")
            .should("be.visible")
            .and("contain", "Username or password is invalid");
    });
});
