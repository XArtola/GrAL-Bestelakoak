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

cy.visit('/signin');



// Fill in credentials and enable "Remember me"

cy.getBySel('signin-username').type("PainterJoy90");

cy.getBySel('signin-password').type("s3cret");

cy.getBySel('signin-remember-me').check();



// Submit the form

cy.getBySel('signin-submit').click();



// Verify redirection to the home page

cy.location('pathname').should('equal', '/');



// Confirm the session cookie expires in ~30 days

cy.getCookie('connect.sid').should('exist').then((cookie) => {

const nowSec = Date.now() / 1000;

const expirySec = cookie!.expiry!;

const daysUntilExpiry = (expirySec - nowSec) / (60 * 60 * 24);



// Assert that the expiry is approximately 30 days (�1 day)

expect(daysUntilExpiry).to.be.closeTo(30, 1);

});
 });
});
