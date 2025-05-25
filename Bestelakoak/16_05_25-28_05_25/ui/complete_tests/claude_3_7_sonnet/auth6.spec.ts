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
// Visit the signup page
cy.visit("/signup");

// Test empty form submission
cy.getBySel("signup-submit").click();

// Verify all required field errors are displayed
cy.getBySel("signup-first-name").should("have.class", "Mui-error");
cy.getBySel("signup-last-name").should("have.class", "Mui-error");
cy.getBySel("signup-username").should("have.class", "Mui-error");
cy.getBySel("signup-password").should("have.class", "Mui-error");
cy.getBySel("signup-confirmPassword").should("have.class", "Mui-error");

// Test password mismatch
cy.getBySel("signup-first-name").type("Bob");
cy.getBySel("signup-last-name").type("Ross");
cy.getBySel("signup-username").type("PainterJoy90");
cy.getBySel("signup-password").type("s3cret");
cy.getBySel("signup-confirmPassword").type("INVALID");
cy.getBySel("signup-submit").click();

// Verify password match error
cy.contains("Password does not match").should("be.visible");

// Test short password
cy.getBySel("signup-password").clear().type("123");
cy.getBySel("signup-confirmPassword").clear().type("123");
cy.getBySel("signup-submit").click();

// Verify password length error
cy.contains("Password must contain at least 4 characters").should("be.visible");

// Test existing username (using the seeded username)
cy.getBySel("signup-password").clear().type("s3cret");
cy.getBySel("signup-confirmPassword").clear().type("s3cret");
cy.getBySel("signup-submit").click();

// Verify username taken error
cy.wait("@signup");
cy.getBySel("signup-error")
.should("be.visible")
.and("contain", "Username already exists");
 });
});
