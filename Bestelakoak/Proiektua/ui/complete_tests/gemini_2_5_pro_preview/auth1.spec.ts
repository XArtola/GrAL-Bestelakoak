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
// <generated_code>

  // Attempt to visit a protected page (e.g., the home page)

  cy.visit("/");

  // Assert that the current URL includes '/signin'

  cy.url().should("include", "/signin");

  // Assert that the signin form is visible

  cy.getBySel("signin-title").should("be.visible");

  // </generated_code>
 });
});
