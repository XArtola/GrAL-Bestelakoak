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
    it('should display login errors', () => {
    cy.visit("/signin");
      cy.getBySel("signin-username").type("invalidUserName");
      cy.getBySel("signin-password").type("invalidPa$word");
      cy.getBySel("signin-submit").click();
      cy.getBySel("signin-error").should("be.visible");
  });
});
