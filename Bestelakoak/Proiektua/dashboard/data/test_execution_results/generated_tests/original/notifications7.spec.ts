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

  it("renders an empty notifications state", function () {
    cy.intercept("GET", "/notifications", []).as("notifications");

    cy.loginByXstate(ctx.userA.username);

    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-notifications").click();
    cy.location("pathname").should("equal", "/notifications");
    cy.getBySel("notification-list").should("not.exist");
    cy.getBySel("empty-list-header").should("contain", "No Notifications");
    cy.visualSnapshot("No Notifications");
  });
});
