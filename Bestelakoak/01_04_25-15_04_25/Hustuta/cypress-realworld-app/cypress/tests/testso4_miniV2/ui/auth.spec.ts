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
        // attempt to visit home without login
        cy.visit("/");
        cy.url().should("include", "/signin");
    });
    it("should redirect to the home page after login", () => {
        // perform login
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        // assert landing on home
        cy.url().should("eq", Cypress.config("baseUrl") + "/");
    });
    it("should remember a user for 30 days after login", () => {
        // login with remember flag
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("input[type=checkbox]").check();
        cy.get("[data-test=signin-submit]").click();
        // check cookie expiry ≈ 30 days
        cy.getCookie("connect.sid").should("exist")
          .its("expiry").should("be.gte", Date.now()/1000 + 24*60*60*29);
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
        // sign up
        cy.visit("/signup");
        cy.get("[data-test=signup-first-name]").type("Bob");
        cy.get("[data-test=signup-last-name]").type("Ross");
        cy.get("[data-test=signup-username]").type("PainterJoy90");
        cy.get("[data-test=signup-password]").type("s3cret");
        cy.get("[data-test=signup-confirmPassword]").type("s3cret");
        cy.get("[data-test=signup-submit]").click();
        // login immediately
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        // logout
        cy.getBySel("sidenav-username").click();
        cy.getBySel("nav-logout").click();
        cy.url().should("include", "/signin");
    });
    it("should display login errors", () => {
        // invalid user
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("invalidUserName");
        cy.get("[data-test=signin-password]").type("s3cret");
        cy.get("[data-test=signin-submit]").click();
        cy.get("[data-test=signin-error]").should("contain","Incorrect username or password.");
        // invalid password
        cy.get("[data-test=signin-username]").clear().type("PainterJoy90");
        cy.get("[data-test=signin-password]").clear().type("invalidPa$$word");
        cy.get("[data-test=signin-submit]").click();
        cy.get("[data-test=signin-error]").should("contain","Incorrect username or password.");
    });
    it("should display signup errors", () => {
        cy.visit("/signup");
        // empty submit
        cy.get("[data-test=signup-submit]").click();
        cy.get("form").within(() => {
          cy.contains("First Name is required");
          cy.contains("Last Name is required");
          cy.contains("Username is required");
        });
    });
    it("should error for an invalid user", () => {
        // non-existent user login
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("noSuchUser");
        cy.get("[data-test=signin-password]").type("INVALID");
        cy.get("[data-test=signin-submit]").click();
        cy.get("[data-test=signin-error]").should("contain","Incorrect username or password.");
    });
    it("should error for an invalid password for existing user", () => {
        cy.visit("/signin");
        cy.get("[data-test=signin-username]").type("PainterJoy90");
        cy.get("[data-test=signin-password]").type("INVALID");
        cy.get("[data-test=signin-submit]").click();
        cy.get("[data-test=signin-error]").should("contain","Incorrect username or password.");
    });
});
