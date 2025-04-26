// check this file using TypeScript if available
// @ts-check
import { User, Like } from "../../../src/models";
const apiLikes = `${Cypress.env("apiUrl")}/likes`;
type TestLikesCtx = {
    authenticatedUser?: User;
    transactionId?: string;
};
describe("Likes API", function () {
    let ctx: TestLikesCtx = {};
    before(() => {
        // Hacky workaround to have the e2e tests pass when cy.visit('http://localhost:3000') is called
        cy.request("GET", "/");
    });
    beforeEach(function () {
        cy.task("db:seed");
        cy.database("filter", "users").then((users: User[]) => {
            ctx.authenticatedUser = users[0];
            return cy.loginByApi(ctx.authenticatedUser.username);
        });
        cy.database("find", "likes").then((like: Like) => {
            ctx.transactionId = like.transactionId;
        });
    });
    context("GET /likes/:transactionId", function () {
        it("gets a list of likes for a transaction", () => { });
    });
    context("POST /likes/:transactionId", function () {
        it("creates a new like for a transaction", () => { });
    });
});
