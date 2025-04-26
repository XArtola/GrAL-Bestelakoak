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
    it("gets a list of users", function() {});
    });
  });

  context("GET /users/:userId", function () {
    it("get a user", function() {});
    });

    it("error when invalid userId", function() {}).then((response) => {
        expect(response.status).to.eq(422);
        expect(response.body.errors.length).to.eq(1);
      });
    });
  });

  context("GET /users/profile/:username", function () {
    it("get a user profile by username", function() {});
        expect(response.body.user).not.to.have.property("balance");
      });
    });
  });

  context("GET /users/search", function () {
    it("get users by email", function() {}).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.results[0]).to.contain({
          firstName: firstName,
        });
      });
    });

    it("get users by phone number", function() {}).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.results[0]).to.contain({
          firstName,
        });
      });
    });

    it("get users by username", function() {}).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.results[0]).to.contain({
          firstName,
        });
      });
    });
  });

  context("POST /users", function () {
    it("creates a new user", function() {}).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.user).to.contain({ firstName });
      });
    });

    it("creates a new user with an account balance in cents", function() {}).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.user).to.contain({ firstName });
        expect(response.body.user.balance).to.equal(100_00);
      });
    });

    it("error when invalid field sent", function() {}).then((response) => {
        expect(response.status).to.eq(422);
        expect(response.body.errors.length).to.eq(1);
      });
    });
  });

  context("PATCH /users/:userId", function () {
    it("updates a user", function() {}).then((response) => {
        expect(response.status).to.eq(204);
      });
    });

    it("error when invalid field sent", function() {}).then((response) => {
        expect(response.status).to.eq(422);
        expect(response.body.errors.length).to.eq(1);
      });
    });
  });

  context("POST /login", function () {
    it("login as user", function() {});
    });
  });
});
