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
            if (ctx.user) {
                return cy.loginByXstate(ctx.user.username);
            }
        });
    });
    // creates a new bank account
    it("creates a new bank account", () => {
        // <generated_code>
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-submit").click();
        cy.wait("@gqlCreateBankAccountMutation").then((interception) => {
            assert.equal(interception.response?.statusCode, 200);
        });
        cy.getBySel("bankaccount-list").should("be.visible");
        // </generated_code>
    });

    // should display bank account form errors
    it("should display bank account form errors", () => {
        // <generated_code>
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-submit").click();
        cy.getBySel("bankaccount-bankName-input-error").should("be.visible");
        cy.getBySel("bankaccount-accountNumber-input-error").should("be.visible");
        cy.getBySel("bankaccount-routingNumber-input-error").should("be.visible");
        // </generated_code>
    });

    // soft deletes a bank account
    it("soft deletes a bank account", () => {
        // <generated_code>
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-list").should("be.visible");
        cy.getBySelLike("bankaccount-delete").first().click();
        cy.wait("@gqlDeleteBankAccountMutation").then((interception) => {
            assert.equal(interception.response?.statusCode, 200);
        });
        cy.getBySel("bankaccount-list").should("be.visible");
        // </generated_code>
    });

    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // <generated_code>
        cy.getBySel("sidenav-bankaccounts").click();
        cy.getBySel("bankaccount-empty").should("be.visible");
        cy.getBySel("bankaccount-onboarding-modal").should("be.visible");
        // </generated_code>
    });
});
