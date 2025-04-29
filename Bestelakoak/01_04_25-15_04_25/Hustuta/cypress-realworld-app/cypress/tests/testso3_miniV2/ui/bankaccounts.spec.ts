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
    // using bank account info: bankName: "The Best Bank", accountNumber: "123456789", routingNumber: "987654321"
    it("creates a new bank account", () => {
        // Navigate to bank account creation form, fill it with provided bank account info, and submit.
        cy.getBySel("new-bankaccount-button").click();
        cy.get('input[name="bankName"]').type("The Best Bank");
        cy.get('input[name="accountNumber"]').type("123456789");
        cy.get('input[name="routingNumber"]').type("987654321");
        cy.get("form").submit();
        cy.wait("@gqlCreateBankAccountMutation");
        cy.getBySel("success-message").should("contain", "Bank account created");
    });
    it("should display bank account form errors", () => {
        // Attempt to submit the bank account form with missing bankName to trigger error messages.
        cy.getBySel("new-bankaccount-button").click();
        cy.get('input[name="bankName"]').clear();
        cy.get("form").submit();
        cy.getBySel("error-message").should("contain", "Bank name is required");
    });
    it("soft deletes a bank account", () => {
        // Create a bank account then trigger the delete action and verify it is soft-deleted.
        cy.getBySel("new-bankaccount-button").click();
        cy.get('input[name="bankName"]').type("The Best Bank");
        cy.get('input[name="accountNumber"]').type("123456789");
        cy.get('input[name="routingNumber"]').type("987654321");
        cy.get("form").submit();
        cy.wait("@gqlCreateBankAccountMutation");
        cy.getBySel("bankaccount-item").first().within(() => {
            cy.getBySel("delete-bankaccount-button").click();
        });
        cy.wait("@gqlDeleteBankAccountMutation");
        cy.getBySel("bankaccount-item").first().should("contain", "Deleted");
    });
    // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
    it("renders an empty bank account list state with onboarding modal", () => {
        // Ensure that when no bank accounts exist, the onboarding modal is displayed.
        cy.task("db:seed"); // Reset data to a known state if needed
        cy.getBySel("bankaccounts-list").should("not.exist");
        cy.getBySel("onboarding-modal").should("be.visible");
    });
});
