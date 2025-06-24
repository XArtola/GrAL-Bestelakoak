import { isMobile } from "../../support/utils";
if (Cypress.env("googleClientId")) {
    describe("Google", function () {
        beforeEach(function () {
            cy.task("db:seed");
            cy.intercept("POST", "/bankAccounts").as("createBankAccount");
            cy.loginByGoogleApi();
        });
        it("should allow a visitor to login, onboard and logout", () => { });
        it("shows onboarding", () => { });
    });
}
