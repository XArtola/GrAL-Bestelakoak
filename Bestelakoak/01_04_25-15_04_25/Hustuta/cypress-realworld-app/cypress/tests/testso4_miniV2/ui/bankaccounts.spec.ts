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
        cy.getBySel("add-bankaccount-btn").click();
        cy.wait("@gqlCreateBankAccountMutation");
        cy.getBySel("bankaccount-name-input").type("The Best Bank");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-submit").click();
        cy.wait("@gqlCreateBankAccountMutation");
        cy.contains("123456789").should("exist");
    });
    it("should display bank account form errors", () => {
        cy.getBySel("add-bankaccount-btn").click();
        cy.getBySel("bankaccount-submit").click();
        cy.contains("Bank name is required");
        cy.contains("Account number is required");
    });
    it("soft deletes a bank account", () => {
        // assume at least one account exists
        cy.getBySelLike("bankaccount-item").first().within(() => {
            cy.getBySel("delete-bankaccount-btn").click();
        });
        cy.wait("@gqlDeleteBankAccountMutation");
        cy.getBySelLike("bankaccount-item").should("not.exist");
    });
    it("renders an empty bank account list state with onboarding modal", () => {
        // seed user with zero accounts (needs support)
        cy.task("db:seed"); // or custom seed without bankaccounts
        cy.reload();
        cy.contains("Add your first bank account").should("exist");
        cy.getBySel("onboarding-modal").should("be.visible");
    });
});
