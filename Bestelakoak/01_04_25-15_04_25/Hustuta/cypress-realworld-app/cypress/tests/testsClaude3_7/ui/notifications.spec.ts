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
            // Login as User B first
            cy.loginByXstate(ctx.userB.username);
            
            // Create a transaction that will be liked later
            cy.visit("/transaction/new");
            cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();
            cy.getBySelLike("amount").type("50");
            cy.getBySelLike("description").type("Payment for notification test");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction id from the URL
            let transactionId: string;
            cy.url().then(url => {
                transactionId = url.split("/").pop()!;
                
                // Log out as User B
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User A
                cy.loginByXstate(ctx.userA.username);
                
                // Visit the transaction that User B created
                cy.visit(`/transaction/${transactionId}`);
                
                // Like the transaction
                cy.getBySel("like-button").click();
                cy.getBySel("like-count").should("contain", "1");
                
                // Log out as User A
                cy.getBySel("sidenav-signout").click();
                
                // Log back in as User B
                cy.loginByXstate(ctx.userB.username);
                
                // Check notifications
                cy.getBySel("sidenav-notifications").click();
                cy.wait("@getNotifications");
                
                // Verify the notification about the like exists
                cy.getBySel("notification-list-item")
                  .first()
                  .should("contain", ctx.userA.firstName)
                  .and("contain", "liked");
            });
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a transaction between User A and User B
            cy.visit("/transaction/new");
            cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
            cy.getBySelLike("amount").type("75");
            cy.getBySelLike("description").type("Transaction between A and B");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction id from the URL
            let transactionId: string;
            cy.url().then(url => {
                transactionId = url.split("/").pop()!;
                
                // Log out as User A
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User C
                cy.loginByXstate(ctx.userC.username);
                
                // Visit the transaction between User A and User B
                cy.visit(`/transaction/${transactionId}`);
                
                // Like the transaction
                cy.getBySel("like-button").click();
                cy.getBySel("like-count").should("contain", "1");
                
                // Log out as User C
                cy.getBySel("sidenav-signout").click();
                
                // First check: Log in as User A and verify notification
                cy.loginByXstate(ctx.userA.username);
                cy.getBySel("sidenav-notifications").click();
                cy.wait("@getNotifications");
                
                // Verify User A received a notification about User C's like
                cy.getBySel("notification-list-item")
                  .first()
                  .should("contain", ctx.userC.firstName)
                  .and("contain", "liked");
                
                // Log out as User A
                cy.getBySel("sidenav-signout").click();
                
                // Second check: Log in as User B and verify notification
                cy.loginByXstate(ctx.userB.username);
                cy.getBySel("sidenav-notifications").click();
                cy.wait("@getNotifications");
                
                // Verify User B also received a notification about User C's like
                cy.getBySel("notification-list-item")
                  .first()
                  .should("contain", ctx.userC.firstName)
                  .and("contain", "liked");
            });
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // Login as User B first
            cy.loginByXstate(ctx.userB.username);
            
            // Create a transaction
            cy.visit("/transaction/new");
            cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();
            cy.getBySelLike("amount").type("35");
            cy.getBySelLike("description").type("Payment for comment test");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction id from the URL
            let transactionId: string;
            cy.url().then(url => {
                transactionId = url.split("/").pop()!;
                
                // Log out as User B
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User A
                cy.loginByXstate(ctx.userA.username);
                
                // Visit the transaction that User B created
                cy.visit(`/transaction/${transactionId}`);
                
                // Add a comment to the transaction
                const commentText = "Great transaction!";
                cy.getBySel("comment-input").type(commentText);
                cy.getBySel("comment-submit").click();
                cy.wait("@postComment");
                
                // Verify the comment appears
                cy.getBySel("comments-list").should("contain", commentText);
                
                // Log out as User A
                cy.getBySel("sidenav-signout").click();
                
                // Log back in as User B
                cy.loginByXstate(ctx.userB.username);
                
                // Check notifications
                cy.getBySel("sidenav-notifications").click();
                cy.wait("@getNotifications");
                
                // Verify the notification about the comment exists
                cy.getBySel("notification-list-item")
                  .first()
                  .should("contain", ctx.userA.firstName)
                  .and("contain", "commented");
            });
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a transaction between User A and User B
            cy.visit("/transaction/new");
            cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
            cy.getBySelLike("amount").type("45");
            cy.getBySelLike("description").type("Transaction for comment by C");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction id from the URL
            let transactionId: string;
            cy.url().then(url => {
                transactionId = url.split("/").pop()!;
                
                // Log out as User A
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User C
                cy.loginByXstate(ctx.userC.username);
                
                // Visit the transaction between User A and User B
                cy.visit(`/transaction/${transactionId}`);
                
                // Add a comment to the transaction
                const commentText = "Interesting transaction!";
                cy.getBySel("comment-input").type(commentText);
                cy.getBySel("comment-submit").click();
                cy.wait("@postComment");
                
                // Verify the comment appears
                cy.getBySel("comments-list").should("contain", commentText);
                
                // Log out as User C
                cy.getBySel("sidenav-signout").click();
                
                // First check: Log in as User A and verify notification
                cy.loginByXstate(ctx.userA.username);
                cy.getBySel("sidenav-notifications").click();
                cy.wait("@getNotifications");
                
                // Verify User A received a notification about User C's comment
                cy.getBySel("notification-list-item")
                  .first()
                  .should("contain", ctx.userC.firstName)
                  .and("contain", "commented");
                
                // Log out as User A
                cy.getBySel("sidenav-signout").click();
                
                // Second check: Log in as User B and verify notification
                cy.loginByXstate(ctx.userB.username);
                cy.getBySel("sidenav-notifications").click();
                cy.wait("@getNotifications");
                
                // Verify User B also received a notification about User C's comment
                cy.getBySel("notification-list-item")
                  .first()
                  .should("contain", ctx.userC.firstName)
                  .and("contain", "commented");
            });
        });
        it("User A sends a payment to User B", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a new payment to User B
            cy.visit("/transaction/new");
            cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
            cy.getBySelLike("amount").type("60");
            cy.getBySelLike("description").type("Payment from A to B");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Log out as User A
            cy.getBySel("sidenav-signout").click();
            
            // Log in as User B
            cy.loginByXstate(ctx.userB.username);
            
            // Check notifications
            cy.getBySel("sidenav-notifications").click();
            cy.wait("@getNotifications");
            
            // Verify the notification about the payment exists
            cy.getBySel("notification-list-item")
              .first()
              .should("contain", ctx.userA.firstName)
              .and("contain", "paid");
            
            // Click on the notification to view the transaction
            cy.getBySel("notification-list-item").first().click();
            
            // Verify we are on the correct transaction page
            cy.getBySel("transaction-detail-header").should("be.visible");
            cy.getBySel("transaction-description").should("contain", "Payment from A to B");
            cy.getBySel("transaction-amount").should("contain", "$60");
        });
        it("User A sends a payment request to User C", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a new payment request to User C
            cy.visit("/transaction/new");
            cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();
            cy.getBySelLike("amount").type("80");
            cy.getBySelLike("description").type("Request from A to C");
            
            // Switch to request mode and submit
            cy.getBySel("transaction-create-submit-request").click();
            cy.getBySelLike("submit-request").click();
            cy.wait("@createTransaction");
            
            // Log out as User A
            cy.getBySel("sidenav-signout").click();
            
            // Log in as User C
            cy.loginByXstate(ctx.userC.username);
            
            // Check notifications
            cy.getBySel("sidenav-notifications").click();
            cy.wait("@getNotifications");
            
            // Verify the notification about the request exists
            cy.getBySel("notification-list-item")
              .first()
              .should("contain", ctx.userA.firstName)
              .and("contain", "requested");
            
            // Click on the notification to view the transaction
            cy.getBySel("notification-list-item").first().click();
            
            // Verify we are on the correct transaction page
            cy.getBySel("transaction-detail-header").should("be.visible");
            cy.getBySel("transaction-description").should("contain", "Request from A to C");
            cy.getBySel("transaction-amount").should("contain", "$80");
            
            // Verify request action buttons are visible
            cy.getBySel("transaction-accept-request").should("be.visible");
            cy.getBySel("transaction-reject-request").should("be.visible");
        });
    });
    it("renders an empty notifications state", () => {
        // Create a new user without any notifications
        cy.database("find", "users").then((users: User[]) => {
            // Using an existing user but will mark all their notifications as read
            const user = users[0];
            
            // Login as the user
            cy.loginByXstate(user.username);
            
            // Go to notifications
            cy.getBySel("sidenav-notifications").click();
            cy.wait("@getNotifications");
            
            // If there are any notifications, mark them all as read
            cy.get("body").then(($body) => {
                if ($body.find("[data-test=notification-list-item]").length > 0) {
                    // Mark all notifications as read
                    cy.getBySel("notifications-mark-all-read").click();
                    cy.wait("@updateNotification");
                }
            });
            
            // Navigate away and then back to notifications to refresh
            cy.getBySel("sidenav-home").click();
            cy.getBySel("sidenav-notifications").click();
            cy.wait("@getNotifications");
            
            // Verify the empty notifications state is displayed
            cy.getBySel("empty-list-header").should("be.visible");
            cy.getBySel("empty-list-content").should("contain", "No Notifications");
        });
    });
});
