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
        // Fill out the form to create a new bank account and verify success
        cy.visit("/bankaccounts");
        cy.get("#bankName").type(bankAccountInfo.bankName);
        cy.get("#accountNumber").type(bankAccountInfo.accountNumber);
        cy.get("#routingNumber").type(bankAccountInfo.routingNumber);
        cy.get("button[type='submit']").click();
        cy.contains("Bank account created successfully").should("be.visible");
    });

    it("should display bank account form errors", () => {
        // Attempt to submit the form with missing fields and verify error messages
        cy.visit("/bankaccounts");
        cy.get("#bankName").type(bankAccountInfo.bankName);
        cy.get("button[type='submit']").click();
        cy.contains("All fields are required").should("be.visible");
    });

    it("soft deletes a bank account", () => {
        // Delete a bank account and verify it is removed from the list
        cy.visit("/bankaccounts");
        cy.get(".bank-account-item").first().find(".delete-button").click();
        cy.contains("Bank account deleted successfully").should("be.visible");
    });

    it("renders an empty bank account list state with onboarding modal", () => {
        // Verify the empty state and onboarding modal
        cy.visit("/bankaccounts");
        cy.get(".empty-state").should("be.visible");
        cy.contains("Get started by adding a bank account").should("be.visible");
    });
});
