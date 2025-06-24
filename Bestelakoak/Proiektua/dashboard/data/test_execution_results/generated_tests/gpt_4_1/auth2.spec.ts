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
    it('should redirect to the home page after login', () => {
    // should redirect to the home page after login
    // 1. Visit the sign-in page
    cy.visit("/signin");

    // 2. Fill in the username and password fields with valid credentials
    cy.get("[data-test=signin-username]").type("PainterJoy90");
    cy.get("[data-test=signin-password]").type("s3cret");

    // 3. Submit the login form
    cy.get("[data-test=signin-submit]").click();

    // 4. Assert that the user is redirected to the home page
    cy.location("pathname").should("eq", "/");

    // 5. Assert that the user's name appears in the sidebar (logged in)
    cy.get("[data-test=sidenav-username]").should("contain", "PainterJoy90");
  });
});
