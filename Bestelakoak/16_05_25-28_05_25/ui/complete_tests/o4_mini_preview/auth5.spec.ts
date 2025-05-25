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
// Visit the sign-in page without any credentials
cy.visit("/signin");

// 1) Empty form submission → required‐field errors
cy.get("button[type='submit']").click();
cy.contains("Username is required").should("be.visible");
cy.contains("Enter your password").should("be.visible");

// 2) Invalid username → non-existent user error
cy.get("input[name='username']")
.clear()
.type("invalidUserName");
cy.get("input[name='password']")
.clear()
.type("s3cret");
cy.get("button[type='submit']").click();
cy.contains(/user not found|invalid username or password/i)
.should("be.visible");

// 3) Invalid password for existing user → incorrect-password error
cy.get("input[name='username']")
.clear()
.type("PainterJoy90");
cy.get("input[name='password']")
.clear()
.type("invalidPa$word");
cy.get("button[type='submit']").click();
cy.contains(/incorrect password|invalid username or password/i)
.should("be.visible");
 });
});
