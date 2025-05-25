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
// Step 1: Visit the signup page
cy.visit("/signup");

// Step 2: Fill out the signup form
cy.getBySel("signup-first-name").type("Bob");
cy.getBySel("signup-last-name").type("Ross");
cy.getBySel("signup-username").type("PainterJoy90");
cy.getBySel("signup-password").type("s3cret");
cy.getBySel("signup-confirmPassword").type("s3cret");

// Step 3: Submit the signup form
cy.getBySel("signup-submit").click();

// Step 4: Verify redirection to the signin page
cy.location("pathname").should("equal", "/signin");

// Step 5: Login with the newly created user credentials
cy.getBySel("signin-username").type("PainterJoy90");
cy.getBySel("signin-password").type("s3cret");
cy.getBySel("signin-submit").click();

// Step 6: Verify redirection to the home page
cy.location("pathname").should("equal", "/");

// Step 7: Logout
if (isMobile()) {
cy.getBySel("sidenav-toggle").click();
}
cy.getBySel("sidenav-signout").click();

// Step 8: Verify redirection back to the signin page
cy.location("pathname").should("equal", "/signin");
//
 });
});
