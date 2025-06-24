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
        it('User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction', () => {
    // First, log in as User C (using a custom command; adjust as needed)
    cy.loginByXstate(ctx.userC.username);

    // Retrieve a transaction between User A and User B from the seeded database
    cy.database("find", "transactions").then((transactions: any[]) => {
      // Find a transaction where User A is the sender and User B is the receiver
      const transaction = transactions.find(
        (t) => t.senderId === ctx.userA.id && t.receiverId === ctx.userB.id
      );
      // Ensure the transaction exists
      expect(transaction, "Transaction between User A and User B exists").to.exist;
  
      // Log the transaction id for debugging
      cy.log("Found transaction with id: " + transaction.id);
  
      // Simulate User C adding a comment on the transaction via an API request
      // (Assuming the backend accepts a POST request to the comments endpoint)
      cy.request({
        method: "POST",
        url: `/comments/${transaction.id}`,
        body: {
          userId: ctx.userC.id,
          content: "This is a comment from User C.",
        },
      }).then((response) => {
        // Expect the comment to be created successfully (HTTP 201 Created)
        expect(response.status).to.eq(201);
      });
  
      // Wait for the comment POST request to complete (using the alias set in beforeEach if applicable)
      cy.wait("@postComment");

      // Verify that User A receives a notification for the new comment
      cy.request({
        method: "GET",
        url: `/notifications?userId=${ctx.userA.id}`,
      }).then((resA: any) => {
        expect(resA.status).to.eq(200);
        // Assert that at least one notification for the transaction contains a commentId
        const notificationForA = resA.body.find(
          (n: any) => n.commentId && n.transactionId === transaction.id
        );
        expect(notificationForA, "User A received a comment notification").to.exist;
      });

      // Verify that User B receives a notification for the new comment
      cy.request({
        method: "GET",
        url: `/notifications?userId=${ctx.userB.id}`,
      }).then((resB: any) => {
        expect(resB.status).to.eq(200);
        const notificationForB = resB.body.find(
          (n: any) => n.commentId && n.transactionId === transaction.id
        );
        expect(notificationForB, "User B received a comment notification").to.exist;
      });
    });
  });
    });
});
