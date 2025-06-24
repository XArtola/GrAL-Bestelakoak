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
    const searchAttrs: (keyof User)[] = [
      "firstName",
      "lastName",
      "username",
      "email",
      "phoneNumber",
    ];

    beforeEach(function () {
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");
    });

    searchAttrs.forEach((attr: keyof User) => {
      it(attr, function () {
        const targetUser = ctx.allUsers![2];

        cy.log(`Searching by **${attr}**`);
        cy.getBySel("user-list-search-input").type(targetUser[attr] as string, { force: true });
        cy.wait("@usersSearch")
          // make sure the backend returns some results
          .its("response.body.results")
          .should("have.length.gt", 0)
          .its("length")
          .then((resultsN) => {
            cy.getBySelLike("user-list-item")
              // make sure the list of results is fully updated
              // and shows the number of results returned from the backend
              .should("have.length", resultsN)
              .first()
              .contains(targetUser[attr] as string);
          });

        cy.visualSnapshot(`User List for Search: ${attr} = ${targetUser[attr]}`);

        cy.focused().clear();
        cy.getBySel("users-list").should("be.empty");
        cy.visualSnapshot("User List Clear Search");
      });
    });
  });
});
