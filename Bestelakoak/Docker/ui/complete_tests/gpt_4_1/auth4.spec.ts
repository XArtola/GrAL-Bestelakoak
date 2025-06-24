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
    it('should allow a visitor to sign-up, login, and logout', () => {
    // should allow a visitor to sign-up, login, and logout

    // Step 1: Visit the sign-up page
    cy.visit("/signup");

    // Step 2: Fill out the sign-up form with userInfo
    cy.getBySel("signup-first-name").type("Bob");
    cy.getBySel("signup-last-name").type("Ross");
    cy.getBySel("signup-username").type("PainterJoy90");
    cy.getBySel("signup-password").type("s3cret");
    cy.getBySel("signup-confirmPassword").type("s3cret");

    // Step 3: Submit the sign-up form
    cy.getBySel("signup-submit").click();

    // Step 4: Wait for the signup request and assert successful signup
    cy.wait("@signup").its("response.statusCode").should("eq", 201);

    // Step 5: Fill out the onboarding bank account form
    cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
    cy.getBySel("bankaccount-accountNumber-input").type("123456789");
    cy.getBySel("bankaccount-routingNumber-input").type("987654321");
    cy.getBySel("bankaccount-submit").click();

    // Step 6: Assert that the user is redirected to the home page and is logged in
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    cy.getBySel("sidenav-username").should("contain", "PainterJoy90");

    // Step 7: Log out
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-signout").click();

    // Step 8: Assert that the user is redirected to the sign-in page
    cy.url().should("include", "/signin");
    cy.getBySel("signin-username").should("be.visible");
  });
});
