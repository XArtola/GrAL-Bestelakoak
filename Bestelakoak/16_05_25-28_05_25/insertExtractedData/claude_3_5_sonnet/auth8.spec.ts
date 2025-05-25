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



// Try to login with valid username but invalid password

cy.getBySel("signin-username").type(userInfo.username);

cy.getBySel("signin-password").type(loginCredentials.invalidPassword);

cy.getBySel("signin-submit").click();



// Verify error message appears

cy.getBySel("signin-error")

.should("be.visible")

.and("have.text", "Username or password is invalid");


 });
});
