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
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
// Find a transaction created by User B

  cy.database("find", "transactions", {
    senderId: ctx.userB.id
  }).then(transaction => {
    // Login as User A

    cy.loginByXstate(ctx.userA.username);
    cy.wait("@getNotifications");

    // Visit the transaction

    cy.visit(`/transaction/${transaction.id}`);

    // Add a comment to the transaction

    const commentText = "Great transaction!";
    cy.getBySel("comment-input").type(commentText);
    cy.getBySel("comment-submit").click();
    cy.wait("@postComment");

    // Verify the comment was added

    cy.getBySel("comments-list").should("contain", commentText);

    // Logout as User A

    cy.getBySel("sidenav-signout").click();

    // Login as User B

    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");

    // Check for notifications

    cy.getBySel("nav-top-notifications-count").should("exist");
    cy.getBySel("nav-top-notifications-link").click();

    // Verify notification about the comment

    cy.getBySel("notification-list-item").first().should("contain", ctx.userA.firstName).and("contain", "commented");
  });
 });
    });
});
