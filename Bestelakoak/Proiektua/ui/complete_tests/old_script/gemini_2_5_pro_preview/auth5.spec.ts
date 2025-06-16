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
    it("should display login errors", () => {
// Visit the signin page

cy.visit("/signin");



// Attempt to submit with empty fields

cy.getBySel("signin-submit").click();

cy.get("#username-helper-text").should("contain", "Username is required");

cy.get("#password-helper-text").should("contain", "Password is required");



// Attempt to login with an invalid username

cy.getBySel("signin-username").type("invalidUserName");

cy.getBySel("signin-password").type("s3cret");

cy.getBySel("signin-submit").click();

cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");



// Clear fields

cy.getBySel("signin-username").clear();

cy.getBySel("signin-password").clear();



// Attempt to login with a valid username but invalid password

cy.getBySel("signin-username").type("PainterJoy90");

cy.getBySel("signin-password").type("invalidPa$word");

cy.getBySel("signin-submit").click();

cy.getBySel("signin-error").should("be.visible").and("contain", "Username or password is invalid");
 });
});
