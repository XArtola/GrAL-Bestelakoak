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
    it("should error for an invalid password for existing user", () => {
// Visit signin page

  cy.visit("/signin");

  // Enter valid username

  cy.getBySel("signin-username").type("PainterJoy90");

  // Enter invalid password

  cy.getBySel("signin-password").type("INVALID");

  // Submit the form

  cy.getBySel("signin-submit").click();

  // Verify error message is displayed

  cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
 });
});
