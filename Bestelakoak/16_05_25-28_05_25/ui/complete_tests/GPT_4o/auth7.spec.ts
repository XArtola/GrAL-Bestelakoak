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
// Visit the sign-in page
cy.visit("/signin");

// Enter invalid username and valid password
cy.get("[data-test=signin-username]").type("invalidUserName");
cy.get("[data-test=signin-password]").type("s3cret");

// Submit the form
cy.get("[data-test=signin-submit]").click();

// Assert that the error message is displayed
cy.get("[data-test=signin-error]")
.should("be.visible")
.and("contain", "Username or password is invalid");
//
 });
});
