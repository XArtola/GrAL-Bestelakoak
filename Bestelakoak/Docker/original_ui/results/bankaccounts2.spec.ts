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

  it("should display bank account form errors", function () {
    cy.visit("/bankaccounts");
    cy.getBySel("bankaccount-new").click();

    cy.getBySelLike("bankName-input").type("The").find("input").clear().blur();
    cy.get("#bankaccount-bankName-input-helper-text")
      .should("be.visible")
      .and("contain", "Enter a bank name");

    cy.getBySelLike("bankName-input").type("The").find("input").blur();
    cy.get("#bankaccount-bankName-input-helper-text")
      .should("be.visible")
      .and("contain", "Must contain at least 5 characters");

    /** Routing number input validations **/
    // Required field
    cy.getBySelLike("routingNumber-input").find("input").focus().blur();
    cy.get(`#bankaccount-routingNumber-input-helper-text`)
      .should("be.visible")
      .and("contain", "Enter a valid bank routing number");

    // Min 9 digit
    cy.getBySelLike("routingNumber-input").type("12345678").find("input").blur();
    cy.get("#bankaccount-routingNumber-input-helper-text")
      .should("be.visible")
      .and("contain", "Must contain a valid routing number");
    cy.getBySelLike("routingNumber-input").find("input").clear();

    cy.getBySelLike("routingNumber-input").type("123456789").find("input").blur();
    cy.get("#bankaccount-routingNumber-input-helper-text").should("not.exist");

    /** Account number input validations **/
    // Required field
    cy.getBySelLike("accountNumber-input").find("input").focus().blur();
    cy.get(`#bankaccount-accountNumber-input-helper-text`)
      .should("be.visible")
      .and("contain", "Enter a valid bank account number");

    // Min 9 digit
    cy.getBySelLike("accountNumber-input").type("12345678").find("input").blur();
    cy.get("#bankaccount-accountNumber-input-helper-text")
      .should("be.visible")
      .and("contain", "Must contain at least 9 digits");
    cy.getBySelLike("accountNumber-input").find("input").clear();

    cy.getBySelLike("accountNumber-input").type("123456789").find("input").blur();
    cy.get("#bankaccount-accountNumber-input-helper-text").should("not.exist");
    cy.getBySelLike("accountNumber-input").find("input").clear();

    // Max 12 gdigit
    cy.getBySelLike("accountNumber-input").type("123456789111").find("input").blur();
    cy.get("#bankaccount-accountNumber-input-helper-text").should("not.exist");
    cy.getBySelLike("accountNumber-input").find("input").clear();

    cy.getBySelLike("accountNumber-input").type("1234567891111").find("input").blur();
    cy.get("#bankaccount-accountNumber-input-helper-text")
      .should("be.visible")
      .and("contain", "Must contain no more than 12 digits");

    cy.getBySel("bankaccount-submit").should("be.disabled");
    cy.visualSnapshot("Bank Account Form with Errors and Submit button disabled");
  });
});
