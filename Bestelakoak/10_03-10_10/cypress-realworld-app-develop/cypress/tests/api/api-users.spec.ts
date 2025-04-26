import { faker } from "@faker-js/faker";
import { User } from "../../../src/models";
const apiUsers = `${Cypress.env("apiUrl")}/users`;
type TestUserCtx = {
    authenticatedUser?: User;
    searchUser?: User;
};
describe("Users API", function () {
    let ctx: TestUserCtx = {};
    before(() => {
        // Hacky workaround to have the e2e tests pass when cy.visit('http://localhost:3000') is called
        cy.request("GET", "/");
    });
    beforeEach(function () {
        cy.task("db:seed");
        cy.database("filter", "users").then((users: User[]) => {
            ctx.authenticatedUser = users[0];
            ctx.searchUser = users[1];
            return cy.loginByApi(ctx.authenticatedUser.username);
        });
    });
    context("GET /users", function () {
        it("gets a list of users", () => { });
    });
    context("GET /users/:userId", function () {
        it("get a user", () => { });
        it("error when invalid userId", () => { });
    });
    context("GET /users/profile/:username", function () {
        it("get a user profile by username", () => { });
    });
    context("GET /users/search", function () {
        it("get users by email", () => { });
        it("get users by phone number", () => { });
        it("get users by username", () => { });
    });
    context("POST /users", function () {
        it("creates a new user", () => { });
        it("creates a new user with an account balance in cents", () => { });
        it("error when invalid field sent", () => { });
    });
    context("PATCH /users/:userId", function () {
        it("updates a user", () => { });
        it("error when invalid field sent", () => { });
    });
    context("POST /login", function () {
        it("login as user", () => { });
    });
});
