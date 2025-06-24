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
    it("should allow a visitor to sign-up, login, and logout", () => {
// Visit the signup page

  cy.visit("/signup");

  // Fill out the signup form with user details

  cy.getBySel("signup-first-name").type("Bob");
  cy.getBySel("signup-last-name").type("Ross");
  cy.getBySel("signup-username").type("PainterJoy90");
  cy.getBySel("signup-password").type("s3cret");
  cy.getBySel("signup-confirmPassword").type("s3cret");

  // Submit the form

  cy.getBySel("signup-submit").click();

  // Wait for the signup request to complete

  cy.wait("@signup");

  // After successful signup, user should be redirected to the onboarding page

  cy.location("pathname").should("equal", "/");

  // Complete onboarding by creating a bank account

  cy.getBySel("user-onboarding-next").click();

  // Fill out bank account form

  cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
  cy.getBySel("bankaccount-routingNumber-input").type("987654321");
  cy.getBySel("bankaccount-accountNumber-input").type("123456789");

  // Submit bank account form

  cy.getBySel("bankaccount-submit").click();

  // Wait for bank account creation

  cy.wait("@gqlCreateBankAccountMutation");

  // Complete the onboarding process

  cy.getBySel("user-onboarding-next").click();
  cy.getBySel("user-onboarding-next").click();
  cy.getBySel("user-onboarding-done").click();

  // Verify successful login by checking for the user's name in the sidenav

  cy.getBySel("sidenav-user-full-name").should("contain", `${"Bob"} ${"Ross"}`);

  // Logout (handle mobile case if needed)

  if (isMobile()) {
    cy.getBySel("sidenav-toggle").click();
  }
  cy.getBySel("sidenav-signout").click();

  // Verify redirect to signin page after logout

  cy.location("pathname").should("equal", "/signin");
 });
});
