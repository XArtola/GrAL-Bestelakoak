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
// Attempt to login with valid username but invalid password

cy.visit("/signin");

cy.getBySel("signin-username").type("PainterJoy90");

cy.getBySel("signin-password").type("invalidPa$word");

cy.getBySel("signin-submit").click();

// Verify that an error notification is shown

cy.getBySel("signin-error").should("be.visible");

// TODO: once the exact error message is known, assert its text:

// cy.getBySel("signin-error").should("contain", "EXPECTED ERROR TEXT");
 });
});
