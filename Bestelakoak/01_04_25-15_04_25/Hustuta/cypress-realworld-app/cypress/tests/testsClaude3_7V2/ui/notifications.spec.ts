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
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Navigate to the public transactions feed to find User B's transaction
            cy.getBySel("nav-public-tab").click();
            cy.wait("@getNotifications");
            
            // Find a transaction by User B and like it
            cy.getBySel("transaction-item")
                .filter(`:contains(${ctx.userB.firstName})`)
                .first()
                .within(() => {
                    cy.getBySel("like-button").click();
                });
            
            // Log out as User A and log in as User B
            cy.switchUserByXstate(ctx.userB.username);
            cy.wait("@getNotifications");
            
            // Open notifications list
            cy.getBySel("nav-top-notifications-count").click();
            
            // Verify that User B received a notification about User A liking their transaction
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userA.firstName)
                .and("contain", "liked");
        });
        
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // Login as User A to create a transaction with User B
            cy.loginByXstate(ctx.userA.username);
            
            // Create a new payment to User B
            cy.getBySel("new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
            cy.getBySel("user-list-item").first().click();
            cy.getBySel("amount-input").type("50");
            cy.getBySel("transaction-create-description-input").type("Test transaction for notification");
            cy.getBySelLike("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction ID of the new transaction
            let transactionId: string;
            cy.getBySel("transaction-item")
                .first()
                .invoke("attr", "data-test-id")
                .then((id) => {
                    transactionId = id as string;
                });
            
            // Log in as User C
            cy.switchUserByXstate(ctx.userC.username);
            cy.wait("@getNotifications");
            
            // Find the transaction and like it
            cy.getBySel("nav-public-tab").click();
            cy.getBySel("transaction-item")
                .filter(`:contains(Test transaction for notification)`)
                .first()
                .within(() => {
                    cy.getBySel("like-button").click();
                });
            
            // Login as User A to check notifications
            cy.switchUserByXstate(ctx.userA.username);
            cy.wait("@getNotifications");
            
            // Check the notification
            cy.getBySel("nav-top-notifications-count").click();
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userC.firstName)
                .and("contain", "liked");
            
            // Login as User B to check notifications
            cy.switchUserByXstate(ctx.userB.username);
            cy.wait("@getNotifications");
            
            // Check the notification
            cy.getBySel("nav-top-notifications-count").click();
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userC.firstName)
                .and("contain", "liked");
        });
        
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Navigate to the public transactions feed to find User B's transaction
            cy.getBySel("nav-public-tab").click();
            cy.wait("@getNotifications");
            
            // Find and click on a transaction by User B
            cy.getBySel("transaction-item")
                .filter(`:contains(${ctx.userB.firstName})`)
                .first()
                .click();
                
            // Add a comment
            const comment = "Great transaction!";
            cy.getBySel("comment-input").type(comment);
            cy.getBySel("comment-submit").click();
            cy.wait("@postComment");
            
            // Login as User B
            cy.switchUserByXstate(ctx.userB.username);
            cy.wait("@getNotifications");
            
            // Check the notification
            cy.getBySel("nav-top-notifications-count").click();
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userA.firstName)
                .and("contain", "commented");
        });
        
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // Login as User A to create a transaction with User B
            cy.loginByXstate(ctx.userA.username);
            
            // Create a new payment to User B
            cy.getBySel("new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
            cy.getBySel("user-list-item").first().click();
            cy.getBySel("amount-input").type("75");
            cy.getBySel("transaction-create-description-input").type("Comment test transaction");
            cy.getBySelLike("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Log in as User C
            cy.switchUserByXstate(ctx.userC.username);
            cy.wait("@getNotifications");
            
            // Find and click on the transaction
            cy.getBySel("nav-public-tab").click();
            cy.getBySel("transaction-item")
                .filter(`:contains(Comment test transaction)`)
                .first()
                .click();
                
            // Add a comment
            const comment = "This looks interesting!";
            cy.getBySel("comment-input").type(comment);
            cy.getBySel("comment-submit").click();
            cy.wait("@postComment");
            
            // Check notifications for User A
            cy.switchUserByXstate(ctx.userA.username);
            cy.wait("@getNotifications");
            cy.getBySel("nav-top-notifications-count").click();
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userC.firstName)
                .and("contain", "commented");
                
            // Check notifications for User B
            cy.switchUserByXstate(ctx.userB.username);
            cy.wait("@getNotifications");
            cy.getBySel("nav-top-notifications-count").click();
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userC.firstName)
                .and("contain", "commented");
        });
        
        it("User A sends a payment to User B", () => {
            // Login as User B
            cy.loginByXstate(ctx.userB.username);
            
            // Get the current notification count for comparison later
            let initialNotificationCount: number;
            cy.getBySel("nav-top-notifications-count")
                .invoke("text")
                .then(text => {
                    initialNotificationCount = parseInt(text || "0");
                });
            
            // Login as User A to send payment to User B
            cy.switchUserByXstate(ctx.userA.username);
            
            // Create a new payment transaction to User B
            cy.getBySel("new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
            cy.getBySel("user-list-item").first().click();
            cy.getBySel("amount-input").type("25");
            cy.getBySel("transaction-create-description-input").type("Payment notification test");
            cy.getBySelLike("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Login back as User B to check for notifications
            cy.switchUserByXstate(ctx.userB.username);
            cy.wait("@getNotifications");
            
            // Verify User B received a notification about the payment
            cy.getBySel("nav-top-notifications-count")
                .invoke("text")
                .then(text => {
                    const newCount = parseInt(text || "0");
                    expect(newCount).to.be.greaterThan(initialNotificationCount);
                });
                
            // Open and check notification
            cy.getBySel("nav-top-notifications-count").click();
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userA.firstName)
                .and("contain", "paid");
        });
        
        it("User A sends a payment request to User C", () => {
            // Login as User C
            cy.loginByXstate(ctx.userC.username);
            
            // Get the current notification count for comparison later
            let initialNotificationCount: number;
            cy.getBySel("nav-top-notifications-count")
                .invoke("text")
                .then(text => {
                    initialNotificationCount = parseInt(text || "0");
                });
            
            // Login as User A to request payment from User C
            cy.switchUserByXstate(ctx.userA.username);
            
            // Create a new request transaction to User C
            cy.getBySel("new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userC.firstName);
            cy.getBySel("user-list-item").first().click();
            cy.getBySel("amount-input").type("35");
            cy.getBySel("transaction-create-description-input").type("Request notification test");
            cy.getBySelLike("transaction-create-submit-request").click();
            cy.wait("@createTransaction");
            
            // Login back as User C to check for notifications
            cy.switchUserByXstate(ctx.userC.username);
            cy.wait("@getNotifications");
            
            // Verify User C received a notification about the request
            cy.getBySel("nav-top-notifications-count")
                .invoke("text")
                .then(text => {
                    const newCount = parseInt(text || "0");
                    expect(newCount).to.be.greaterThan(initialNotificationCount);
                });
                
            // Open and check notification
            cy.getBySel("nav-top-notifications-count").click();
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userA.firstName)
                .and("contain", "requested");
        });
    });
    
    it("renders an empty notifications state", () => {
        // Create a new user that won't have any notifications
        cy.task("db:seed");
        
        // Login with a user that has no notifications (or clear all notifications)
        cy.loginByXstate(ctx.userA.username);
        
        // Click on the notifications menu
        cy.getBySel("nav-top-notifications-count").click();
        
        // Check if there are any notifications to dismiss
        cy.get("body").then($body => {
            if ($body.find('[data-test="notification-list-item"]').length > 0) {
                // Dismiss all notifications
                cy.getBySel("notification-mark-read").click({ multiple: true });
            }
        });
        
        // Reload the page to ensure empty state appears
        cy.reload();
        cy.getBySel("nav-top-notifications-count").click();
        
        // Verify empty notifications state
        cy.getBySel("empty-list-header").should("be.visible");
        cy.getBySel("empty-list-header").should("contain", "No Notifications");
    });
});
