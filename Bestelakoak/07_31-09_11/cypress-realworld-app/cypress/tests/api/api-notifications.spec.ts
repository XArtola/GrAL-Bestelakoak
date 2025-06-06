import { User, NotificationType, Like, Comment, Transaction } from "../../../src/models";

const apiNotifications = `${Cypress.env("apiUrl")}/notifications`;

type TestNotificationsCtx = {
  authenticatedUser?: User;
  transactionId?: string;
  notificationId?: string;
  likeId?: string;
  commentId?: string;
};

describe("Notifications API", function () {
  let ctx: TestNotificationsCtx = {};

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

    cy.database("find", "transactions").then((transaction: Transaction) => {
      ctx.transactionId = transaction.id;
    });

    cy.database("find", "notifications").then((notification: NotificationType) => {
      ctx.notificationId = notification.id;
    });

    cy.database("find", "likes").then((like: Like) => {
      ctx.likeId = like.transactionId;
    });

    cy.database("find", "comments").then((comment: Comment) => {
      ctx.commentId = comment.transactionId;
    });
  });

  context("GET /notifications", function () {
    it("gets a list of notifications for a user", function() {});
    });
  });

  context("POST /notifications", function () {
    it("creates notifications for transaction, like and comment", function() {}).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.results.length).to.equal(3);
        expect(response.body.results[0].transactionId).to.equal(ctx.transactionId);
      });
    });
  });

  context("PATCH /notifications/:notificationId", function () {
    it("updates a notification", function() {}).then((response) => {
        expect(response.status).to.eq(204);
      });
    });

    it("error when invalid field sent", function() {}).then((response) => {
        expect(response.status).to.eq(422);
        expect(response.body.errors.length).to.eq(1);
      });
    });
  });
});
