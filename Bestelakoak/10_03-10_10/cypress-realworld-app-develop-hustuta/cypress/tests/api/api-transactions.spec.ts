import { faker } from "@faker-js/faker";
import { isEqual } from "lodash/fp";
import { User, NotificationType, Transaction, BankAccount } from "../../../src/models";
type TestTransactionsCtx = {
    receiver?: User;
    authenticatedUser?: User;
    transactionId?: string;
    notificationId?: string;
    bankAccountId?: string;
};
const getFakeAmount = () => parseInt(faker.finance.amount(), 10);
const apiTransactions = `${Cypress.env("apiUrl")}/transactions`;
describe("Transactions API", function () {
    let ctx: TestTransactionsCtx = {};
    before(() => {
        // Hacky workaround to have the e2e tests pass when cy.visit('http://localhost:3000') is called
        cy.request("GET", "/");
    });
    const isSenderOrReceiver = ({ senderId, receiverId }: Transaction) => isEqual(senderId, ctx.authenticatedUser!.id) || isEqual(receiverId, ctx.authenticatedUser!.id);
    beforeEach(function () {
        cy.task("db:seed");
        cy.database("filter", "users").then((users: User[]) => {
            ctx.authenticatedUser = users[0];
            ctx.receiver = users[1];
            return cy.loginByApi(ctx.authenticatedUser.username);
        });
        cy.database("find", "transactions").then((transaction: Transaction) => {
            ctx.transactionId = transaction.id;
        });
        cy.database("find", "notifications").then((notification: NotificationType) => {
            ctx.notificationId = notification.id;
        });
        cy.database("find", "bankaccounts").then((bankaccount: BankAccount) => {
            ctx.bankAccountId = bankaccount.id;
        });
    });
    context("GET /transactions", function () {
        it("gets a list of transactions for user (default)", () => { });
        it("gets a list of pending request transactions for user", () => { });
        it("gets a list of pending request transactions for user between a time range", () => { });
    });
    context("GET /transactions/contacts", function () {
        it("gets a list of transactions for users list of contacts, page one", () => { });
        it("gets a list of transactions for users list of contacts, page two", () => { });
    });
    context("GET /transactions/public", function () {
        it("gets a list of public transactions", () => { });
    });
    context("POST /transactions", function () {
        it("creates a new payment", () => { });
        it("creates a new request", () => { });
    });
    context("PATCH /transactions/:transactionId", function () {
        it("updates a transaction", () => { });
        it("error when invalid field sent", () => { });
    });
});
