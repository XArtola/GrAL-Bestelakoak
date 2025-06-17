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
    it('should display signup errors', () => {
    // "should display signup errors"

    // Use provided userInfo and loginCredentials as test data
    const userInfo = {
        firstName: "Bob",
        lastName: "Ross",
        username: "PainterJoy90",
        password: "s3cret"
    };

    const loginCredentials = {
        validPassword: "s3cret",
        invalidUsername: "invalidUserName",
        invalidPassword: "invalidPa$word",
        anotherInvalidPassword: "INVALID"
    };

    // STEP 1: Visit the signup page
    // (Assuming the signup page is at "/signup". Update the URL if needed.)
    cy.visit("/signup");

    // Test Case 1: Missing first name
    // Fill out the form leaving the first name empty
    cy.get('input[name="firstName"]').clear();
    cy.get('input[name="lastName"]').clear().type("Ross");
    cy.get('input[name="username"]').clear().type("PainterJoy90");
    cy.get('input[name="password"]').clear().type("s3cret");
    cy.get('input[name="confirmPassword"]').clear().type("s3cret");
    cy.get('button[type="submit"]').click();

    // Assert an error message related to the required first name is displayed
    cy.contains(/first name is required/i).should("be.visible");

    // Test Case 2: Invalid username format
    cy.reload();  // Reset the form by reloading the page
    cy.get('input[name="firstName"]').clear().type("Bob");
    cy.get('input[name="lastName"]').clear().type("Ross");
    cy.get('input[name="username"]').clear().type("invalidUserName");
    cy.get('input[name="password"]').clear().type("s3cret");
    cy.get('input[name="confirmPassword"]').clear().type("s3cret");
    cy.get('button[type="submit"]').click();

    // Assert an error message indicating invalid username is displayed
    cy.contains(/invalid username/i).should("be.visible");

    // Test Case 3: Password and confirmation mismatch
    cy.reload();  // Reset the form again
    cy.get('input[name="firstName"]').clear().type("Bob");
    cy.get('input[name="lastName"]').clear().type("Ross");
    cy.get('input[name="username"]').clear().type("PainterJoy90");
    cy.get('input[name="password"]').clear().type("s3cret");
    cy.get('input[name="confirmPassword"]').clear().type("INVALID");
    cy.get('button[type="submit"]').click();

    // Assert an error message for password mismatch is displayed
    cy.contains(/passwords do not match/i).should("be.visible");
  });
});
