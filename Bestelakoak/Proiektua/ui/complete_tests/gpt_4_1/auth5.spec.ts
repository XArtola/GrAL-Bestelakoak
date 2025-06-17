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
    it('should display login errors', () => {
    // should display login errors
    // 1. Attempt login with invalid username and valid password
    cy.visit("/signin");
    cy.getBySel("signin-username").type("invalidUserName");
    cy.getBySel("signin-password").type("s3cret");
    cy.getBySel("signin-submit").click();
    cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");

    // 2. Attempt login with valid username and invalid password
    cy.getBySel("signin-username").clear().type("PainterJoy90");
    cy.getBySel("signin-password").clear().type("invalidPa$word");
    cy.getBySel("signin-submit").click();
    cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");

    // 3. Attempt login with valid username and another invalid password
    cy.getBySel("signin-username").clear().type("PainterJoy90");
    cy.getBySel("signin-password").clear().type("INVALID");
    cy.getBySel("signin-submit").click();
    cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
  });
});
