import Dinero from "dinero.js";
import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
type NewTransactionTestCtx = {
  allUsers?: User[];
  user?: User;
  contact?: User;
};
describe("New Transaction", function () {
  const ctx: NewTransactionTestCtx = {};
  beforeEach(function () {
    cy.task("db:seed");
    cy.intercept("GET", "/users*").as("allUsers");
    cy.intercept("GET", "/users/search*").as("usersSearch");
    cy.intercept("POST", "/transactions").as("createTransaction");
    cy.intercept("GET", "/notifications").as("notifications");
    cy.intercept("GET", "/transactions/public").as("publicTransactions");
    cy.intercept("GET", "/transactions").as("personalTransactions");
    cy.intercept("PATCH", "/transactions/*").as("updateTransaction");
    cy.database("filter", "users").then((users: User[]) => {
      ctx.allUsers = users;
      ctx.user = users[0];
      ctx.contact = users[1];
      return cy.loginByXstate(ctx.user.username);
    });
  });
  context("searches for a user by attribute", function () {
    const searchAttrs: (keyof User)[] = ["firstName", "lastName", "username", "email", "phoneNumber"];
    beforeEach(function () {
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");
    });
    searchAttrs.forEach((attr: keyof User) => {
      it(attr, () => {});
    });
  });
});