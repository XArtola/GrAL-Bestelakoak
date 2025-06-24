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
    it("User A sends a payment request to User C", function () {
      cy.loginByXstate(ctx.userA.username);

      cy.getBySelLike("new-transaction").click();
      cy.createTransaction({
        transactionType: "request",
        amount: 300,
        description: "🛫🛬 Airfare",
        sender: ctx.userA,
        receiver: ctx.userC,
      });
      cy.wait("@createTransaction");

      cy.switchUserByXstate(ctx.userC.username);
      cy.visualSnapshot(`Switch to User ${ctx.userC.username}`);

      cy.getBySelLike("notifications-link").click();
      cy.getBySelLike("notification-list-item")
        .should("contain", ctx.userA.firstName)
        .and("contain", "requested payment");
      cy.visualSnapshot("User C Notified of Request from User A");
    });
  });
});
