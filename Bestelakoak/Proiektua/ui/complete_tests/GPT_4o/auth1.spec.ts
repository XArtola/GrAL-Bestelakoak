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
// it("should redirect unauthenticated user to signin page", () => { });
<generated_code>
    // Attempt to visit a protected page without authentication
    cy.visit("/bankaccounts");

    // Assert that the user is redirected to the signin page
    cy.url().should("include", "/signin");

    // Verify that the signin page elements are visible
    cy.getBySel("signin-title").should("be.visible");
    cy.getBySel("signin-username").should("be.visible");
    cy.getBySel("signin-password").should("be.visible");
    cy.getBySel("signin-submit").should("be.visible");
</generated_code>
 });
});
