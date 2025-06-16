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
// should remember a user for 30 days after login
cy.visit("/signin");

// Enter valid login credentials
cy.getBySel("signin-username").type("PainterJoy90");
cy.getBySel("signin-password").type("s3cret");

// Check the "Remember me" checkbox
cy.getBySel("signin-remember-me").check();

// Submit the login form
cy.getBySel("signin-submit").click();

// Verify login was successful by checking we're on the home page
cy.location("pathname").should("equal", "/");

// Verify the cookie has a long expiration date (approximately 30 days)
cy.getCookie("connect.sid").then(cookie => {
  const cookieExpirationDate = new Date(cookie!.expiry! * 1000);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.setDate(now.getDate() + 30));
  
  // The cookie should expire approximately 30 days from now (give or take a day for timing)
  const daysDifference = Math.round(
    (cookieExpirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  expect(daysDifference).to.be.closeTo(30, 1);
});
 });
});
