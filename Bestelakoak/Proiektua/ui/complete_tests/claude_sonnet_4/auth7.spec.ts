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
    it("should error for an invalid user", () => {
// Visit the signin page

  cy.visit("/signin");

  // Fill in invalid username with valid password

  cy.getBySel("signin-username").type("invalidUserName");
  cy.getBySel("signin-password").type("s3cret");

  // Click the sign in button

  cy.getBySel("signin-submit").click();

  // Verify error message is displayed

  cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
 });
});
