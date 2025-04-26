// check this file using TypeScript if available
// @ts-check

import { faker } from "@faker-js/faker";
import { User, BankAccount } from "../../../src/models";

const apiBankAccounts = `${Cypress.env("apiUrl")}/bankAccounts`;
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;

type TestBankAccountsCtx = {
  allUsers?: User[];
  authenticatedUser?: User;
  bankAccounts?: BankAccount[];
};

describe("Bank Accounts API", function () {
  let ctx: TestBankAccountsCtx = {};

  before(() => {
    // Hacky workaround to have the e2e tests pass when cy.visit('http://localhost:3000') is called
    cy.request("GET", "/");
  });

  beforeEach(function () {
    cy.task("db:seed");

    cy.database("filter", "users").then((users: User[]) => {
      ctx.authenticatedUser = users[0];
      ctx.allUsers = users;

      return cy.loginByApi(ctx.authenticatedUser.username);
    });

    cy.database("filter", "bankaccounts").then((bankAccounts: BankAccount[]) => {
      ctx.bankAccounts = bankAccounts;
    });
  });

  context("GET /bankAccounts", function () {
    it("gets a list of bank accounts for user", function() {});
    });
  });

  context("GET /bankAccounts/:bankAccountId", function () {
    it("gets a bank account", function() {});
    });
  });

  context("POST /bankAccounts", function () {
    it("creates a new bank account", function() {}).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.account.id).to.be.a("string");
        expect(response.body.account.userId).to.eq(userId);
      });
    });
  });

  context("DELETE /contacts/:bankAccountId", function () {
    it("deletes a bank account", function() {});
    });
  });

  context("/graphql", function () {
    it("gets a list of bank accounts for user", function() {}).then((response) => {
        expect(response.status).to.eq(200);
        expect(JSON.stringify(response.body.errors || "notThere")).to.eq('"notThere"');
        expect(response.body.data.listBankAccount[0].userId).to.eq(userId);
      });
    });
    it("creates a new bank account", function() {}).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.createBankAccount.userId).to.eq(userId);
      });
    });
    it("deletes a bank account", function() {}).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});
