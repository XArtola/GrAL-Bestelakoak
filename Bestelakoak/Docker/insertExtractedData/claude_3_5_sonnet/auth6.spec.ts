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
    it("should display signup errors", () => {
// Visit the signup page

cy.visit("/signup");



// Test 1: Submit empty form to check required field validations

cy.getBySel("signup-submit").click();



// Assert that error messages are shown for all required fields

cy.getBySel("signup-first-name").should("have.class", "Mui-error");

cy.getBySel("signup-last-name").should("have.class", "Mui-error"); 

cy.getBySel("signup-username").should("have.class", "Mui-error");

cy.getBySel("signup-password").should("have.class", "Mui-error");

cy.getBySel("signup-confirmPassword").should("have.class", "Mui-error");



// Test 2: Test password mismatch validation

cy.getBySel("signup-first-name").type(userInfo.firstName);

cy.getBySel("signup-last-name").type(userInfo.lastName);

cy.getBySel("signup-username").type(userInfo.username);

cy.getBySel("signup-password").type(userInfo.password);

cy.getBySel("signup-confirmPassword").type(loginCredentials.anotherInvalidPassword);

cy.getBySel("signup-submit").click();



// Assert password mismatch error

cy.contains("Password does not match").should("be.visible");



// Test 3: Test minimum password length validation

cy.getBySel("signup-password").clear().type("123");

cy.getBySel("signup-confirmPassword").clear().type("123");

cy.getBySel("signup-submit").click();



// Assert password length error

cy.contains("Password must contain at least 4 characters").should("be.visible");


 });
});
