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
    it('should redirect unauthenticated user to signin page', () => {
    // it("should redirect unauthenticated user to signin page")
    //
    // 1. Clear any stored session data
    // 2. Visit a protected page (assuming the home page is protected)
    // 3. Assert that the URL redirects to the signin page and the signin form is visible
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit("/");

    // Verify that the user is redirected to '/signin'
    cy.url().should("include", "/signin");

    // Verify that the sign in form appears (using data-test attribute as an example)
    cy.get('[data-test="signin-username"]').should("be.visible");
  });
});
