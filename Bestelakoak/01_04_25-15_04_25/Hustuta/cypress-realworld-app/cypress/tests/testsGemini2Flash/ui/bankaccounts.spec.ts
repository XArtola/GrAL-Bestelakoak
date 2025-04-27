import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
type BankAccountsTestCtx = {
    user?: User;
};
describe("Bank Accounts", function () {
    const ctx: BankAccountsTestCtx = {};
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/notifications").as("getNotifications");
        cy.intercept("POST", apiGraphQL, (req) => {
            const operationAliases: Record<string, string> = {
                ListBankAccount: "gqlListBankAccountQuery",
                CreateBankAccount: "gqlCreateBankAccountMutation",
                DeleteBankAccount: "gqlDeleteBankAccountMutation",
            };
            const { body } = req;
            const operationName = body?.operationName;
            if (body.hasOwnProperty("operationName") &&
                operationName &&
                operationAliases[operationName]) {
                req.alias = operationAliases[operationName];
            }
        });
        cy.database("find", "users").then((user: User) => {
            ctx.user = user;
            return cy.loginByXstate(ctx.user.username);
        });
    });

    // creates a new bank account
    it("creates a new bank account", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\bankaccounts.spec.ts
      cy.getBySel("sidenav-bankaccounts").click();
      cy.getBySel("bankaccount-new").click();
      cy.getBySel("bankaccount-bankName-input").type(this.bankAccountInfo.bankName);
      cy.getBySel("bankaccount-routingNumber-input").type(this.bankAccountInfo.routingNumber);
      cy.getBySel("bankaccount-accountNumber-input").type(this.bankAccountInfo.accountNumber);
      cy.getBySel("bankaccount-submit").click();
      cy.wait("@gqlCreateBankAccountMutation").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.getBySelLike("bankaccount-list-item").should("contain", this.bankAccountInfo.bankName);
      });
    });

    // should display bank account form errors
    it("should display bank account form errors", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\bankaccounts.spec.ts
      cy.getBySel("sidenav-bankaccounts").click();
      cy.getBySel("bankaccount-new").click();
      cy.getBySel("bankaccount-submit").click();
      cy.getBySel("bankaccount-bankName-error").should("be.visible");
      cy.getBySel("bankaccount-routingNumber-error").should("be.visible");
      cy.getBySel("bankaccount-accountNumber-error").should("be.visible");
    });

    // soft deletes a bank account
    it("soft deletes a bank account", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\bankaccounts.spec.ts
      cy.getBySel("sidenav-bankaccounts").click();
      cy.getBySel("bankaccount-delete").first().click();
      cy.wait("@gqlDeleteBankAccountMutation").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.getBySel("bankaccount-list").should("not.contain", this.bankAccountInfo.bankName);
      });
    });

    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\bankaccounts.spec.ts
      cy.database("find", "users").then((user: User) => {
        cy.loginByXstate(user.username);
        cy.intercept("GET", "/bankAccounts").as("getBankAccounts");
        cy.visit("/");
        cy.getBySel("sidenav-bankaccounts").click();
        cy.wait("@getBankAccounts");
        cy.getBySel("bankaccount-empty").should("be.visible");
        cy.getBySel("bankaccount-onboarding-modal").should("be.visible");
      });
    });
});
