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
// Visit the signin page

  cy.visit("/signin");

  // Fill in login credentials with valid username and password

  cy.getBySel("signin-username").type("PainterJoy90");
  cy.getBySel("signin-password").type("s3cret");

  // Click the submit button

  cy.getBySel("signin-submit").click();

  // Assert that user is redirected to the home page

  cy.location("pathname").should("equal", "/");

  // Verify that we're on the authenticated home page by checking for UI elements

  cy.getBySel("sidenav-user-full-name").should("contain", `${"Bob"} ${"Ross"}`);
 });
});
