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
    it("should redirect to the home page after login", () => {
// Visit the sign-in page
cy.visit('/signin');

// Fill in the username and password fields
cy.get('[data-test="signin-username"]').type("PainterJoy90");
cy.get('[data-test="signin-password"]').type("s3cret");

// Submit the login form
cy.get('[data-test="signin-submit"]').click();

// Verify that after login we land on the home page
cy.location('pathname').should('equal', '/');
 });
});
