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
    it("should display signup errors", () => {
// should display signup errors
cy.visit("/signup");

// Test submitting empty form - should show required field errors
cy.getBySel("signup-submit").click();
cy.get("#firstName-helper-text").should("contain", "First Name is required");
cy.get("#lastName-helper-text").should("contain", "Last Name is required");
cy.get("#username-helper-text").should("contain", "Username is required");
cy.get("#password-helper-text").should("contain", "Enter your password");
cy.get("#confirmPassword-helper-text").should("contain", "Confirm your password");

// Test password mismatch error
cy.getBySel("signup-first-name").type("Bob");
cy.getBySel("signup-last-name").type("Ross");
cy.getBySel("signup-username").type("TestUser123");
cy.getBySel("signup-password").type("s3cret");
cy.getBySel("signup-confirmPassword").type("invalidPa$word");
cy.getBySel("signup-submit").click();
cy.get("#confirmPassword-helper-text").should("contain", "Password does not match");
 });
});
