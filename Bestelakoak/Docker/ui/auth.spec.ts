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
    it("should redirect unauthenticated user to signin page", () => { });
    it("should redirect to the home page after login", () => { });
    it("should remember a user for 30 days after login", () => { });
    it("should allow a visitor to sign-up, login, and logout", () => { });
    it("should display login errors", () => { });
    it("should display signup errors", () => { });
    it("should error for an invalid user", () => { });
    it("should error for an invalid password for existing user", () => { });
});
