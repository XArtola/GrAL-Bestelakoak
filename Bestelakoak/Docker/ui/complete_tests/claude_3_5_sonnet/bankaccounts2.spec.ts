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
    cy.intercept("POST", apiGraphQL, req => {
      const operationAliases: Record<string, string> = {
        ListBankAccount: "gqlListBankAccountQuery",
        CreateBankAccount: "gqlCreateBankAccountMutation",
        DeleteBankAccount: "gqlDeleteBankAccountMutation"
      };
      const {
        body
      } = req;
      const operationName = body?.operationName;
      if (body.hasOwnProperty("operationName") && operationName && operationAliases[operationName]) {
        req.alias = operationAliases[operationName];
      }
    });
    cy.database("find", "users").then((user: User) => {
      ctx.user = user;
      return cy.loginByXstate(ctx.user.username);
    });
  });
  it("should display bank account form errors", () => {});
});