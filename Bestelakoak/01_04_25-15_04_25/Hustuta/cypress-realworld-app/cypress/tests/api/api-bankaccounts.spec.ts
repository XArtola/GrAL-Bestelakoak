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
        it("gets a list of bank accounts for user", () => { });
    });
    context("GET /bankAccounts/:bankAccountId", function () {
        it("gets a bank account", () => { });
    });
    context("POST /bankAccounts", function () {
        it("creates a new bank account", () => { });
    });
    context("DELETE /contacts/:bankAccountId", function () {
        it("deletes a bank account", () => { });
    });
    context("/graphql", function () {
        it("gets a list of bank accounts for user", () => { });
        it("creates a new bank account", () => { });
        it("deletes a bank account", () => { });
    });
});
