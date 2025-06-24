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
    it('should display signup errors', () => {
    // should display signup errors
    // 1. Visit the signup page
    cy.visit("/signup");

    // 2. Try submitting the form with empty fields
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-error").should("be.visible");

    // 3. Fill only some fields and submit
    cy.getBySel("signup-first-name").type("Bob");
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-error").should("be.visible");

    // 4. Fill all fields except password and submit
    cy.getBySel("signup-last-name").type("Ross");
    cy.getBySel("signup-username").type("PainterJoy90");
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-error").should("be.visible");

    // 5. Use an invalid password (e.g., too short)
    cy.getBySel("signup-password").type("123");
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-error").should("be.visible");

    // 6. Use a valid password but an invalid username (e.g., already taken or invalid format)
    cy.getBySel("signup-password").clear().type("s3cret");
    cy.getBySel("signup-username").clear().type("in valid username!");
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-error").should("be.visible");

    // 7. Use a username that is already taken (simulate by signing up first, then again)
    cy.getBySel("signup-username").clear().type("PainterJoy90");
    cy.getBySel("signup-submit").click();
    cy.wait("@signup");
    cy.getBySel("signup-error").should("be.visible");
  });
});
