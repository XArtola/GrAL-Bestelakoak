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
        it('User A comments on a transaction of User B; User B gets notification that User A commented on their transaction', () => {
    // User A comments on a transaction of User B; User B gets notification that User A commented on their transaction

    // Log the beginning of the test
    cy.log("Test: User A comments on a transaction of User B; User B gets notification that User A commented on their transaction");

    // Step 1: Retrieve a transaction where User B is the receiver using our database helper
    cy.database("filter", "transactions").then((transactions: any[]) => {
      // Find a transaction that belongs to User B
      const transaction = transactions.find(t => t.receiverId === ctx.userB.id);
      expect(transaction, "Found transaction for User B").to.be.ok;

      // Step 2: User A posts a comment on the found transaction
      const commentContent = "Awesome transaction!";
      cy.request({
        method: "POST",
        url: `/comments/${transaction.id}`, // Assumes comment endpoint includes the transaction id in the URL
        body: {
          userId: ctx.userA.id,
          transactionId: transaction.id,
          content: commentContent
        }
      }).then((response) => {
        expect(response.status).to.equal(200);
      });

      // Wait for the intercept of the POST /comments/* request
      cy.wait("@postComment");

      // Step 3: Fetch notifications for User B to verify the notification for the comment exists
      cy.request({
        method: "GET",
        url: `/notifications?userId=${ctx.userB.id}`
      }).then((res) => {
        expect(res.status).to.equal(200);
        // Look for a notification that indicates a comment by User A on the specific transaction
        const notifications = res.body;
        const notification = notifications.find(n =>
          n.transactionId === transaction.id &&
          n.type === "comment" &&
          n.commentContent === commentContent
        );
        expect(notification, "Notification for comment exists").to.be.ok;
      });
    });
  });
    });
});
