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
// should redirect unauthenticated user to signin page
cy.visit("/personal"); // Attempt to access a protected page

// Verify we're redirected to the signin page
cy.location("pathname").should("equal", "/signin");

// Verify signin page elements are visible
cy.getBySel("signin-title").should("be.visible");
 });
});
