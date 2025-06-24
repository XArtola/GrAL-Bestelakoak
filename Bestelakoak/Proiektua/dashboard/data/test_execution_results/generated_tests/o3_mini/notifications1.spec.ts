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
        it('User A likes a transaction of User B; User B gets notification that User A liked transaction ', () => {
    // "User A likes a transaction of User B; User B gets notification that User A liked transaction"

    // Step 1: Simulate that User B has a transaction available.
    // (This would normally be set up via the backend or a helper command; here we assign a dummy transaction id.)
    const transactionId = "tx-123"; // Placeholder transaction ID for User B's transaction

    // Step 2: Simulate User A liking the transaction.
    // Here we send a POST request to the (assumed) likes endpoint.
    cy.request({
        method: "POST",
        url: "/api/likes", // Assumed endpoint for liking a transaction
        body: {
            transactionId,
            likedBy: ctx.userA.username // Use User A's username
        }
    }).then((response) => {
        // Assert that the like request was successful.
        expect(response.status).to.equal(200);
    });

    // Step 3: Wait for the notifications API call to complete.
    cy.wait("@getNotifications");

    // Step 4: Retrieve notifications for User B to verify that User A's like has been recorded.
    cy.request({
        method: "GET",
        url: `/api/notifications?userId=${ctx.userB.id}` // Assumed query parameter to filter User B's notifications
    }).then((res) => {
        expect(res.status).to.equal(200);
        const notifications = res.body;
        // Assert that there exists a notification indicating that User A liked the transaction.
        const likeNotification = notifications.find((n) =>
            n.type === "like" &&
            n.from === ctx.userA.username &&
            n.transactionId === transactionId
        );
        expect(likeNotification, "User B should receive a like notification from User A").to.exist;
    });
  });
    });
});
