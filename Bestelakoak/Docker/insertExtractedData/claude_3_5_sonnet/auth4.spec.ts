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
// Visit signup page

cy.visit("/signup");



// Fill out the signup form

cy.getBySel("signup-first-name").type(userInfo.firstName);

cy.getBySel("signup-last-name").type(userInfo.lastName);

cy.getBySel("signup-username").type(userInfo.username);

cy.getBySel("signup-password").type(userInfo.password);

cy.getBySel("signup-confirmPassword").type(userInfo.password);



// Submit signup form

cy.getBySel("signup-submit").click();



// Wait for signup API call to complete

cy.wait("@signup");



// Create bank account during onboarding

cy.getBySel("user-onboarding-next").click();

cy.getBySel("bankaccount-bankName-input").type(bankAccountInfo.bankName);

cy.getBySel("bankaccount-routingNumber-input").type(bankAccountInfo.routingNumber);

cy.getBySel("bankaccount-accountNumber-input").type(bankAccountInfo.accountNumber);

cy.getBySel("bankaccount-submit").click();



// Wait for bank account creation

cy.wait("@gqlCreateBankAccountMutation");



// Complete onboarding

cy.getBySel("user-onboarding-next").click();

cy.getBySel("user-onboarding-next").click();

cy.getBySel("user-onboarding-done").click();



// Verify successful login after signup

cy.getBySel("sidenav-user-full-name").should("contain", `${userInfo.firstName} ${userInfo.lastName}`);



// Logout

if (isMobile()) {

cy.getBySel("sidenav-toggle").click();

}

cy.getBySel("sidenav-signout").click();



// Verify redirect to signin page after logout

cy.location("pathname").should("equal", "/signin");


 });
});
