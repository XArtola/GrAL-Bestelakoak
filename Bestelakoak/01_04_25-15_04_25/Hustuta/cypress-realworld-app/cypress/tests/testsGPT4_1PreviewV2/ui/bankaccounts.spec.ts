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
    it("creates a new bank account", () => {
        // creates a new bank account
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
        cy.wait("@gqlCreateBankAccountMutation");
        cy.contains("The Best Bank").should("be.visible");
        cy.contains("Account Number:").should("contain", "123456789");
    });
    it("should display bank account form errors", () => {
        // should display bank account form errors
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-bankName-input").clear().blur();
        cy.getBySel("bankaccount-routingNumber-input").clear().blur();
        cy.getBySel("bankaccount-accountNumber-input").clear().blur();
        cy.contains("Enter a bank name").should("be.visible");
        cy.contains("Enter a valid bank routing number").should("be.visible");
        cy.contains("Enter a valid bank account number").should("be.visible");
    });
    it("soft deletes a bank account", () => {
        // soft deletes a bank account
        cy.getBySel("bankaccount-list-item").first().within(() => {
            cy.getBySel("bankaccount-delete").click();
        });
        cy.wait("@gqlDeleteBankAccountMutation");
        cy.getBySel("bankaccount-list-item").should("have.length.greaterThan", 0);
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // renders an empty bank account list state with onboarding modal
        // Remove all bank accounts for the user
        cy.getBySel("bankaccount-list-item").each(() => {
            cy.getBySel("bankaccount-delete").first().click();
            cy.wait("@gqlDeleteBankAccountMutation");
        });
        cy.getBySel("bankaccount-list-item").should("have.length", 0);
        cy.getBySel("user-onboarding-dialog").should("be.visible");
    });
});
