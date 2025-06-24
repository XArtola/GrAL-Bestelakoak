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
    it('should remember a user for 30 days after login', () => {
    // should remember a user for 30 days after login
    // 1. Sign up a new user
    cy.visit("/signup");
    cy.getBySel("signup-first-name").type("Bob");
    cy.getBySel("signup-last-name").type("Ross");
    cy.getBySel("signup-username").type("PainterJoy90");
    cy.getBySel("signup-password").type("s3cret");
    cy.getBySel("signup-confirmPassword").type("s3cret");
    cy.getBySel("signup-submit").click();
    cy.wait("@signup");

    // 2. Create a bank account (required after signup)
    cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
    cy.getBySel("bankaccount-accountNumber-input").type("123456789");
    cy.getBySel("bankaccount-routingNumber-input").type("987654321");
    cy.getBySel("bankaccount-submit").click();
    cy.wait("@gqlCreateBankAccountMutation");

    // 3. Log out
    cy.getBySel("sidenav-signout").click();
    cy.url().should("include", "/signin");

    // 4. Log in with "Remember Me" checked
    cy.getBySel("signin-username").type("PainterJoy90");
    cy.getBySel("signin-password").type("s3cret");
    cy.getBySel("signin-remember-me").find("input").check();
    cy.getBySel("signin-submit").click();

    // 5. Assert user is redirected to home and session persists
    cy.url().should("eq", `${window.location.origin}/`);
    cy.getBySel("sidenav-username").should("contain", "PainterJoy90");

    // 6. Simulate browser restart by clearing cookies but keeping localStorage/sessionStorage
    cy.clearCookies();
    cy.reload();

    // 7. Assert user is still logged in after reload (session persists)
    cy.getBySel("sidenav-username").should("contain", "PainterJoy90");
  });
});
