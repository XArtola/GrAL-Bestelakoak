import "../../support/auth-provider-commands/cognito";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
if (Cypress.env("cognito_username")) {
    // Sign in with AWS
    if (Cypress.env("cognito_programmatic_login")) {
        describe("AWS Cognito, programmatic login (cypress.config.ts#cognito_programmatic_login: true)", function () {
            beforeEach(function () {
                cy.task("db:seed");
                cy.intercept("POST", apiGraphQL).as("createBankAccount");
                cy.loginByCognitoApi(Cypress.env("cognito_username"), Cypress.env("cognito_password"));
            });
            it("should allow a visitor to login, onboard and logout", () => { });
            it("shows onboarding", () => { });
        });
    }
    else {
        describe("AWS Cognito, cy.origin() login (cypress.config.ts#cognito_programmatic_login: false)", function () {
            beforeEach(function () {
                cy.task("db:seed");
                cy.loginByCognito(Cypress.env("cognito_username"), Cypress.env("cognito_password"));
                cy.visit("/");
            });
            it("shows onboarding", () => { });
            it("should allow a visitor to login, onboard and logout", () => { });
        });
    }
}
