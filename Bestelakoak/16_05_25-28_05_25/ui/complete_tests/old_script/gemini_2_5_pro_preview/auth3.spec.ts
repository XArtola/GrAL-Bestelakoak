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
// Visit the signin page

cy.visit("/signin");



// Enter username

cy.getBySel("signin-username").type("PainterJoy90");

// Enter password

cy.getBySel("signin-password").type("s3cret");

// Check the remember me checkbox

cy.getBySel("signin-remember-me").check();

// Click the signin button

cy.getBySel("signin-submit").click();



// Assert redirection to the home page

cy.location("pathname").should("equal", "/");



// Check cookie expiry (approx. 30 days)

cy.getCookie("connect.sid").should("exist").then((cookie) => {

expect(cookie).to.have.property("expiry");

const expiryDate = new Date(cookie!.expiry! * 1000);

const thirtyDaysFromNow = new Date();

thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

// Allow for a small difference in timing (e.g., 1 day)

const diffInMilliseconds = Math.abs(expiryDate.getTime() - thirtyDaysFromNow.getTime());

const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);

expect(diffInDays).to.be.closeTo(0, 1); // Check if the difference is within 1 day

});
 });
});
