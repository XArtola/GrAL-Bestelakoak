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
    it(
      "User A likes a transaction of User B; User B gets notification that User A liked transaction ",
      // NOTE: this test seems to have issues in Firefox UI/Mobile tests due to an issue with the Base Button component in MUI v4
      // we should try unskipping this test in Firefox once we upgrade MUI to v5+. @see https://github.com/cypress-io/cypress-realworld-app/issues/1278
      { browser: { name: "!firefox" } },
      function () {
        cy.loginByXstate(ctx.userA.username);
        cy.wait("@getNotifications");

        cy.database("find", "transactions", { senderId: ctx.userB.id }).then(
          (transaction: Transaction) => {
            cy.visit(`/transaction/${transaction.id}`);
          }
        );

        cy.log("🚩 Renders the notifications badge with count");
        cy.wait("@getNotifications")
          .its("response.body.results.length")
          .then((notificationCount) => {
            cy.getBySel("nav-top-notifications-count").should("have.text", `${notificationCount}`);
          });
        cy.visualSnapshot("Renders the notifications badge with count");

        const likesCountSelector = "[data-test*=transaction-like-count]";
        cy.contains(likesCountSelector, 0);
        cy.getBySelLike("like-button").click();
        // a successful "like" should disable the button and increment
        // the number of likes
        cy.getBySelLike("like-button").should("be.disabled");
        cy.contains(likesCountSelector, 1);
        cy.visualSnapshot("Like Count Incremented");

        cy.switchUserByXstate(ctx.userB.username);
        cy.visualSnapshot(`Switch to User ${ctx.userB.username}`);

        cy.wait("@getNotifications")
          .its("response.body.results.length")
          .as("preDismissedNotificationCount");

        cy.visit("/notifications");

        cy.wait("@getNotifications");

        cy.getBySelLike("notification-list-item")
          .should("have.length", 9)
          .first()
          .should("contain", ctx.userA?.firstName)
          .and("contain", "liked");

        cy.log("🚩 Marks notification as read");
        cy.getBySelLike("notification-mark-read").first().click({ force: true });
        cy.wait("@updateNotification");

        cy.get("@preDismissedNotificationCount").then((count) => {
          cy.getBySelLike("notification-list-item").should("have.length.lessThan", Number(count));
        });
        cy.visualSnapshot("Notification count after notification dismissed");
      }
    );

    it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", function() {}).then((transaction: Transaction) => {
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

    it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", function() {}).then(
        (transaction: Transaction) => {
          cy.visit(`/transaction/${transaction.id}`);
        }
      );

      cy.getBySelLike("comment-input").type("Thank You{enter}");

      cy.wait("@postComment");

      cy.switchUserByXstate(ctx.userB.username);
      cy.visualSnapshot(`Switch to User ${ctx.userB.username}`);

      cy.getBySelLike("notifications-link").click();

      cy.wait("@getNotifications");

      cy.getBySelLike("notification-list-item")
        .should("have.length", 9)
        .first()
        .should("contain", ctx.userA?.firstName)
        .and("contain", "commented");
      cy.visualSnapshot("User A Notified of User B Comment");
    });

    it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", function() {}).then((transaction: Transaction) => {
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

    it("User A sends a payment to User B", function() {});
      cy.wait("@createTransaction");

      cy.switchUserByXstate(ctx.userB.username);
      cy.visualSnapshot(`Switch to User ${ctx.userB.username}`);

      cy.getBySelLike("notifications-link").click();
      cy.visualSnapshot("Navigate to Notifications");

      cy.getBySelLike("notification-list-item")
        .first()
        .should("contain", ctx.userB.firstName)
        .and("contain", "received payment");
      cy.visualSnapshot("User B Notified of Payment");
    });

    it("User A sends a payment request to User C", function() {});
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

  it("renders an empty notifications state", function() {});
});
