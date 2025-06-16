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
// Log in as User A

  cy.loginByXstate(ctx.userA.username);

  // Find a transaction by User B

  cy.database("find", "transactions", {
    senderId: ctx.userB.id
  }).then(transaction => {
    // Navigate to the transaction

    cy.visit(`/transaction/${transaction.id}`);

    // Add a comment to the transaction

    const commentText = "This is a test comment from User A";
    cy.getBySel("comment-input").type(commentText);
    cy.getBySel("comment-submit").click();
    cy.wait("@postComment");

    // Log out User A

    cy.getBySel("sidenav-signout").click();

    // Log in as User B

    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");

    // Check for the notification

    cy.getBySel("notifications-link").click();
    cy.getBySel("notification-list-item").should("contain", ctx.userA.firstName).and("contain", "commented");
  });
 });
    });
});
