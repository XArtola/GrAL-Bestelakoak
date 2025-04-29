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
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
        cy.wait("@gqlCreateBankAccountMutation");
        cy.getBySel("bankaccount-list").should("contain", "The Best Bank");
    });

    it("should display bank account form errors", () => {
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-submit").click();
        cy.getBySel("bankaccount-bankName-error").should("contain", "Enter a bank name");
        cy.getBySel("bankaccount-routingNumber-error").should("contain", "Enter a valid routing number");
        cy.getBySel("bankaccount-accountNumber-error").should("contain", "Enter a valid account number");
    });

    it("soft deletes a bank account", () => {
        cy.getBySel("bankaccount-list-item").first().find("[data-test=bankaccount-delete]").click();
        cy.wait("@gqlDeleteBankAccountMutation");
        cy.getBySel("bankaccount-list-item").first().should("not.exist");
    });

    it("renders an empty bank account list state with onboarding modal", () => {
        cy.getBySel("bankaccount-list").should("not.exist");
        cy.getBySel("user-onboarding-dialog").should("be.visible");
    });
});
