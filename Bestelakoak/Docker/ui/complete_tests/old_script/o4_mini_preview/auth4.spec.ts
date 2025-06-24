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
// Visit the sign-up page

cy.visit("/signup");



// Fill out the sign-up form

cy.getBySel("signup-first-name").type("Bob");

cy.getBySel("signup-last-name").type("Ross");

cy.getBySel("signup-username").type("PainterJoy90");

cy.getBySel("signup-password").type("s3cret");

cy.getBySel("signup-confirmPassword").type("s3cret");



// Submit and wait for the REST signup call

cy.getBySel("signup-submit").click();

cy.wait("@signup");



// Assert redirection to the sign-in page

cy.location("pathname").should("equal", "/signin");



// Visit the sign-in page (in case the redirect didn�t navigate)

cy.visit("/signin");



// Fill out the login form

cy.getBySel("signin-username").type("PainterJoy90");

cy.getBySel("signin-password").type("s3cret");



// Submit and verify successful login UI

cy.getBySel("signin-submit").click();

cy.getBySel("sidenav-user-full-name")

.should("contain", `${"Bob"} ${"Ross"}`);



// Log out

if (isMobile()) {

cy.getBySel("sidenav-toggle").click();

}

cy.getBySel("sidenav-signout").click();



// Assert redirection back to the sign-in page

cy.location("pathname").should("equal", "/signin");
 });
});
