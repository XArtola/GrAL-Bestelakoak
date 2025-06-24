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
    it('soft deletes a bank account', () => {
    // it("soft deletes a bank account", () => { })
    //
    // Step 1: Create a bank account using the provided bankAccountInfo.
    cy.log("Creating a bank account using provided info");
    cy.request({
        method: "POST",
        url: `${Cypress.env("apiUrl")}/bankAccounts`,
        body: {
            bankName: userInfo.bankAccountInfo.bankName,
            routingNumber: userInfo.bankAccountInfo.routingNumber,
            accountNumber: userInfo.bankAccountInfo.accountNumber,
        },
    }).then((createRes) => {
        // Assert that the bank account was created successfully.
        expect(createRes.status).to.eq(201);
        const bankAccountId = createRes.body.id;
        cy.log("Bank account created with id: " + bankAccountId);

        // Step 2: Perform the UI action to soft delete the bank account.
        // Assume that the bank account is rendered with a data-test attribute in the format:
        // "bank-account-", and the soft delete is triggered with an element having
        // the data-test "delete-bank-account".
        cy.get(`[data-test="bank-account-${bankAccountId}"]`)
          .find('[data-test="delete-bank-account"]')
          .click();

        // Step 3: Wait for the deletion GraphQL mutation to complete.
        cy.wait("@gqlDeleteBankAccountMutation");

        // Step 4: Assert that the bank account now reflects a soft deleted state.
        // This might be indicated by a CSS class (e.g. "deleted") in the UI.
        cy.get(`[data-test="bank-account-${bankAccountId}"]`)
          .should("have.class", "deleted");

        // Optionally, verify via API that the bank account is marked as deleted.
        cy.request({
            method: "GET",
            url: `${Cypress.env("apiUrl")}/bankAccounts/${bankAccountId}`,
        }).then((getRes) => {
            expect(getRes.body.isDeleted).to.be.true;
        });
    });
  });
});
