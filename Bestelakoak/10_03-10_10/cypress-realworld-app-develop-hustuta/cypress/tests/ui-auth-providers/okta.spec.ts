import { isMobile } from "../../support/utils";
if (Cypress.env("okta_username")) {
    if (Cypress.env("okta_programmatic_login")) {
        describe("Okta", function () {
            beforeEach(function () {
                cy.task("db:seed");
                cy.intercept("POST", "/bankAccounts").as("createBankAccount");
                cy.loginByOktaApi(Cypress.env("okta_username"), Cypress.env("okta_password"));
            });
            it("should allow a visitor to login, onboard and logout", () => { });
            it("shows onboarding", () => { });
        });
    }
    else {
        describe("Okta", function () {
            beforeEach(function () {
                cy.task("db:seed");
                cy.loginByOkta(Cypress.env("okta_username"), Cypress.env("okta_password"));
                cy.visit("/");
            });
            it("verifies signed in user does not have a bank account", () => { });
            it("verifies signed in user does not have any notifications", () => { });
        });
    }
}
