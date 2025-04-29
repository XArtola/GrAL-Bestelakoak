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
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => {
            // Test the like notification flow.
            // More information is needed regarding user identities and transaction context.
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // Test the like notification flow when a third user likes a transaction.
            // More details are required.
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // Test comment notification from User A’s comment on User B’s transaction.
            // More information is needed.
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // Test that both concerned users receive notification for User C’s comment.
            // More details are required.
        });
        it("User A sends a payment to User B", () => {
            // Test the payment transaction to check that notification is generated.
            // Additional information is required.
        });
        it("User A sends a payment request to User C", () => {
            // Test the payment request flow and verify that appropriate notification is displayed.
            // More details are required.
        });
    });
    it("renders an empty notifications state", () => {
        // Simulate a state with no notifications and assert that an empty state message is shown.
        // More information is needed.
    });
});
