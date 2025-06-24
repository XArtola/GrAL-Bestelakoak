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
// Test: should redirect to the home page after login

  // <generated_code>

  // Visit the signin page

  cy.visit("/signin");

  // Enter username and password from userInfo

  cy.get("[data-test='signin-username']").type("PainterJoy90");
  cy.get("[data-test='signin-password']").type("s3cret");

  // Click the signin button

  cy.get("[data-test='signin-submit']").click();

  // Assert that the URL is the home page

  cy.url().should("eq", `${Cypress.config().baseUrl}/`);

  // Assert that the user's username is displayed in the sidenav (or a similar element)

  // This confirms the user is logged in and recognized.

  cy.get("[data-test='sidenav-username']").should("contain", "PainterJoy90");

  // </generated_code>
 });
});
