import { isMobile } from "../../support/utils";
import { User, Transaction } from "../../../src/models";

type NotificationsCtx = {
  userA: User;
  userB: User;
  userC: User;
};

describe("Notifications", function () {
  const ctx = {} as NotificationsCtx;

  beforeEach(function () {
    cy.task("db:seed");

    cy.intercept("GET", "/notifications*").as("getNotifications");
    cy.intercept("POST", "/transactions").as("createTransaction");
    cy.intercept("PATCH", "/notifications/*").as("updateNotification");
    cy.intercept("POST", "/comments/*").as("postComment");

    cy.database("filter", "users").then((users: User[]) => {
      ctx.userA = users[0];
      ctx.userB = users[1];
      ctx.userC = users[2];
    });
  });

  describe("notifications from user interactions", function () {
    it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", function () {
      cy.loginByXstate(ctx.userC.username);

      cy.database("find", "transactions", {
        senderId: ctx.userB.id,
        receiverId: ctx.userA.id,
      }).then((transaction: Transaction) => {
        cy.visit(`/transaction/${transaction.id}`);
      });

      cy.getBySelLike("comment-input").type("Thank You{enter}");

      cy.wait("@postComment");

      cy.switchUserByXstate(ctx.userA.username);
      cy.visualSnapshot("Switch to User A");
      cy.visualSnapshot(`Switch to User ${ctx.userA.username}`);

      cy.getBySelLike("notifications-link").click();

      cy.wait("@getNotifications");

      cy.getBySelLike("notification-list-item")
        .should("have.length", 9)
        .first()
        .should("contain", ctx.userC.firstName)
        .and("contain", "commented");
      cy.visualSnapshot("User A Notified of User C Comment");

      cy.switchUserByXstate(ctx.userB.username);
      cy.visualSnapshot(`Switch to User ${ctx.userB.username}`);

      cy.getBySelLike("notifications-link").click();
      cy.getBySelLike("notification-list-item")
        .should("have.length", 9)
        .first()
        .should("contain", ctx.userC.firstName)
        .and("contain", "commented");
      cy.visualSnapshot("User B Notified of User C Comment");
    });
  });
});
