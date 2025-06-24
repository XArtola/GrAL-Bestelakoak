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
    it("should redirect to the home page after login", () => {
// it("should redirect to the home page after login", () => { });

<generated_code>
// Test: Redirect to the home page after login
it("should redirect to the home page after login", () => {
    // Step 1: Visit the sign-in page
    cy.visit("/signin");

    // Step 2: Fill in valid login credentials
    cy.get("[data-test='signin-username']").type("PainterJoy90");
    cy.get("[data-test='signin-password']").type("s3cret");

    // Step 3: Submit the login form
    cy.get("[data-test='signin-submit']").click();

    // Step 4: Verify redirection to the home page
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);

    // Step 5: Verify that the user's full name is displayed in the sidebar
    cy.get("[data-test='sidenav-user-full-name']").should("contain", `${"Bob"} ${"Ross"}`);
});
</generated_code>
 });
});
