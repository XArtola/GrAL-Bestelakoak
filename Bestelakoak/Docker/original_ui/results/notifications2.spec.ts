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
    it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", function () {
      cy.loginByXstate(ctx.userC.username);

      cy.database("find", "transactions", {
        senderId: ctx.userB.id,
        receiverId: ctx.userA.id,
      }).then((transaction: Transaction) => {
        cy.visit(`/transaction/${transaction.id}`);
      });

      const likesCountSelector = "[data-test*=transaction-like-count]";
      cy.contains(likesCountSelector, 0);
      cy.getBySelLike("like-button").click();
      cy.getBySelLike("like-button").should("be.disabled");
      cy.contains(likesCountSelector, 1);
      cy.visualSnapshot("Like Count Incremented");

      cy.switchUserByXstate(ctx.userA.username);
      cy.visualSnapshot(`Switch to User ${ctx.userA.username}`);

      cy.getBySelLike("notifications-link").click();

      cy.wait("@getNotifications");

      cy.location("pathname").should("equal", "/notifications");

      cy.getBySelLike("notification-list-item")
        .should("have.length", 9)
        .first()
        .should("contain", ctx.userC.firstName)
        .and("contain", "liked");
      cy.visualSnapshot("User A Notified of User B Like");

      cy.switchUserByXstate(ctx.userB.username);
      cy.visualSnapshot(`Switch to User ${ctx.userB.username}`);

      cy.getBySelLike("notifications-link").click();

      cy.wait("@getNotifications");

      cy.getBySelLike("notification-list-item")
        .should("have.length", 9)
        .first()
        .should("contain", ctx.userC.firstName)
        .and("contain", "liked");
      cy.visualSnapshot("User B Notified of User C Like");
    });
  });
});
