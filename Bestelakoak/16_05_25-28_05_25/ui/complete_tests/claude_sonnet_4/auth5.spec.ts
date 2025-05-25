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
    it("should display login errors", () => {
// should display login errors
it("should display login errors", () => {
// Visit the signin page
cy.visit("/signin");

// Test 1: Submit empty form to check required field errors
cy.getBySel("signin-submit").click();

// Assert that error messages are displayed for empty fields
cy.get("#username-helper-text").should("contain", "Username is required");
cy.get("#password-helper-text").should("contain", "Enter your password");

// Test 2: Try login with invalid username and valid password
cy.getBySel("signin-username").type("invalidUserName");
cy.getBySel("signin-password").type("s3cret");
cy.getBySel("signin-submit").click();

// Assert error message for invalid credentials
cy.getBySel("signin-error")
.should("be.visible")
.and("contain", "Username or password is invalid");

// Test 3: Clear fields and try with valid username but invalid password
cy.getBySel("signin-username").clear().type("PainterJoy90");
cy.getBySel("signin-password").clear().type("invalidPa$word");
cy.getBySel("signin-submit").click();

// Assert error message for invalid password
cy.getBySel("signin-error")
.should("be.visible")
.and("contain", "Username or password is invalid");
});
 });
});
