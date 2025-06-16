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
// Sign up

cy.visit("/signup");

cy.getBySel("signup-first-name").type("Bob");

cy.getBySel("signup-last-name").type("Ross");

cy.getBySel("signup-username").type("PainterJoy90");

cy.getBySel("signup-password").type("s3cret");

cy.getBySel("signup-confirmPassword").type("s3cret");

cy.getBySel("signup-submit").click();

cy.wait("@signup");



// Login

// Depending on the app's flow, signup might automatically log the user in

// or redirect to signin. Assuming redirection to signin or manual navigation.

cy.visit("/signin");

cy.getBySel("signin-username").type("PainterJoy90");

cy.getBySel("signin-password").type("s3cret");

cy.getBySel("signin-submit").click();



// Assert successful login (e.g., redirected to home, username displayed)

cy.location("pathname").should("equal", "/");

cy.getBySel("sidenav-username").should("contain", "PainterJoy90");



// Logout

if (isMobile()) {

cy.getBySel("sidenav-toggle").click();

}

cy.getBySel("sidenav-signout").click();



// Assert successful logout (e.g., redirected to signin)

cy.location("pathname").should("equal", "/signin");
 });
});
