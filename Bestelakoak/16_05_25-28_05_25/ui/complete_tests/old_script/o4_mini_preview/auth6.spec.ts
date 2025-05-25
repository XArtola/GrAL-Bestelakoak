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



// 1) Submit empty form and assert required-field errors

cy.get('button[type="submit"]').click();

cy.get("#firstName-helper-text").should("contain", "First Name is required");

cy.get("#lastName-helper-text").should("contain", "Last Name is required");

cy.get("#username-helper-text").should("contain", "Username is required");

cy.get("#password-helper-text").should("contain", "Enter your password");

cy.get("#confirmPassword-helper-text").should("contain", "Confirm your password");



// 2) Fill in all fields but use mismatched passwords, then assert mismatch error

cy.get("#firstName").type("Bob");

cy.get("#lastName").type("Ross");

cy.get("#username").type("PainterJoy90");

cy.get("#password").type("s3cret");

cy.get("#confirmPassword").type("INVALID");

cy.get('button[type="submit"]').click();

cy.get("#confirmPassword-helper-text").should("contain", "Password does not match");
 });
});
