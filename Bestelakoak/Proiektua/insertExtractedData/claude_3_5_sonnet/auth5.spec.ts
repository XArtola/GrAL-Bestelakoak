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



// Test empty form submission

cy.getBySel("signin-submit").click();

cy.get("#username-helper-text").should("contain", "Username is required");

cy.get("#password-helper-text").should("contain", "Password is required");



// Test invalid username

cy.getBySel("signin-username").type(loginCredentials.invalidUsername);

cy.getBySel("signin-password").type(loginCredentials.validPassword);

cy.getBySel("signin-submit").click();

cy.getBySel("signin-error")

.should("be.visible")

.and("contain", "Username or password is invalid");



// Test invalid password for existing user

cy.reload(); // Clear previous error state

cy.getBySel("signin-username").type(userInfo.username);

cy.getBySel("signin-password").type(loginCredentials.invalidPassword);

cy.getBySel("signin-submit").click();

cy.getBySel("signin-error")

.should("be.visible")

.and("contain", "Username or password is invalid");



// Test password mismatch during signup

cy.visit("/signup");

cy.getBySel("signup-first-name").type(userInfo.firstName);

cy.getBySel("signup-last-name").type(userInfo.lastName);

cy.getBySel("signup-username").type(userInfo.username);

cy.getBySel("signup-password").type(userInfo.password);

cy.getBySel("signup-confirmPassword").type(loginCredentials.anotherInvalidPassword);

cy.getBySel("signup-submit").click();

cy.get("#confirmPassword-helper-text")

.should("be.visible")

.and("contain", "Password does not match");


 });
});
