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
// Visit the sign-in page

cy.visit("/signin");



// Attempt to submit the form without entering any credentials

cy.get("button[type='submit']").click();



// Assert that error messages are displayed for missing username and password

cy.contains("Username is required").should("be.visible");

cy.contains("Password is required").should("be.visible");



// Enter an invalid username and valid password

cy.get("input[name='username']").type("invalidUserName");

cy.get("input[name='password']").type("s3cret");

cy.get("button[type='submit']").click();



// Assert that an error message is displayed for invalid username

cy.contains("Incorrect username or password.").should("be.visible");



// Enter a valid username and invalid password

cy.get("input[name='username']").clear().type("PainterJoy90");

cy.get("input[name='password']").clear().type("invalidPa$word");

cy.get("button[type='submit']").click();



// Assert that an error message is displayed for invalid password

cy.contains("Incorrect username or password.").should("be.visible");
 });
});
