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
    it("should remember a user for 30 days after login", () => {
// Visit the sign-in page

cy.visit("/signin");



// Fill in login credentials

cy.get("[data-test=signin-username]").type("PainterJoy90");

cy.get("[data-test=signin-password]").type("s3cret");



// Check the "Remember Me" checkbox

cy.get("[data-test=signin-remember-me]").check();



// Submit the login form

cy.get("[data-test=signin-submit]").click();



// Verify successful login by checking the URL

cy.location("pathname").should("equal", "/");



// Verify the session cookie exists and has a long expiration date

cy.getCookie("connect.sid").then((cookie) => {

const cookieExpirationDate = new Date(cookie!.expiry! * 1000);

const now = new Date();

const thirtyDaysFromNow = new Date(now.setDate(now.getDate() + 30));



// Assert that the cookie expiration date is approximately 30 days from now

const daysDifference = Math.round((cookieExpirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

expect(daysDifference).to.be.closeTo(30, 1);

});
 });
});
