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
    // should redirect unauthenticated user to signin page
    // 1. Visit a protected route (e.g., home page).
    // 2. Assert that the user is redirected to the signin page.
    cy.visit("/");
    cy.location("pathname").should("eq", "/signin");
  });
});
