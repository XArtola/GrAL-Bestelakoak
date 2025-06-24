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

      if (
        body.hasOwnProperty("operationName") &&
        operationName &&
        operationAliases[operationName]
      ) {
        req.alias = operationAliases[operationName];
      }
    });

    cy.database("find", "users").then((user: User) => {
      ctx.user = user;

      return cy.loginByXstate(ctx.user.username);
    });
  });

  // TODO: [enhancement] the onboarding modal assertion can be removed after adding "onboarded" flag to user profile
  it("renders an empty bank account list state with onboarding modal", function () {
    cy.wait("@getNotifications");
    cy.intercept("POST", apiGraphQL, (req) => {
      const { body } = req;
      if (body.hasOwnProperty("operationName") && body.operationName === "ListBankAccount") {
        req.alias = "gqlListBankAccountQuery";
        req.continue((res) => {
          res.body.data.listBankAccount = [];
        });
      }
    });

    cy.visit("/bankaccounts");
    cy.wait("@getNotifications");
    cy.wait("@gqlListBankAccountQuery");

    cy.getBySel("bankaccount-list").should("not.exist");
    cy.getBySel("empty-list-header").should("contain", "No Bank Accounts");
    cy.getBySel("user-onboarding-dialog").should("be.visible");
    cy.getBySel("nav-top-notifications-count").should("exist");
    cy.visualSnapshot("User Onboarding Dialog is Visible");
  });
});
