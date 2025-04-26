import { User } from "../../../src/models";
const apiBankTransfer = `${Cypress.env("apiUrl")}/bankTransfers`;
type TestBankTransferCtx = {
    authenticatedUser?: User;
};
describe("Bank Transfer API", function () {
    let ctx: TestBankTransferCtx = {};
    before(() => {
        // Hacky workaround to have the e2e tests pass when cy.visit('http://localhost:3000') is called
        cy.request("GET", "/");
    });
    beforeEach(function () {
        cy.task("db:seed");
        cy.database("find", "users").then((user: User) => {
            ctx.authenticatedUser = user;
            return cy.loginByApi(ctx.authenticatedUser.username);
        });
    });
    context("GET /bankTransfer", function () {
        it("gets a list of bank transfers for user", () => { });
    });
});
