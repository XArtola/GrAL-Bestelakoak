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
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Navigate to public feed to find User B's transaction
            cy.getBySel("nav-public-tab").click();
            cy.wait("@getNotifications");
            
            // Find a transaction by User B
            cy.database("find", "transactions", { senderId: ctx.userB.id }).then(transaction => {
                // Navigate to that transaction
                cy.visit(`/transaction/${transaction.id}`);
                
                // Like the transaction
                cy.getBySel("like-button").click();
                
                // Logout User A
                cy.getBySel("sidenav-signout").click();
                
                // Login as User B
                cy.loginByXstate(ctx.userB.username);
                cy.wait("@getNotifications");
                
                // Check for the notification
                cy.getBySel("notifications-link").click();
                cy.getBySel("notification-list-item")
                    .should("contain", ctx.userA.firstName)
                    .and("contain", "liked");
            });
        });
        
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // Find a transaction between User A and User B
            cy.database("find", "transactions", {
                senderId: ctx.userA.id,
                receiverId: ctx.userB.id
            }).then(transaction => {
                // Login as User C
                cy.loginByXstate(ctx.userC.username);
                cy.wait("@getNotifications");
                
                // Navigate to the transaction
                cy.visit(`/transaction/${transaction.id}`);
                
                // Like the transaction
                cy.getBySel("like-button").click();
                
                // Logout User C
                cy.getBySel("sidenav-signout").click();
                
                // Login as User A and check for notification
                cy.loginByXstate(ctx.userA.username);
                cy.wait("@getNotifications");
                cy.getBySel("notifications-link").click();
                cy.getBySel("notification-list-item")
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "liked");
                
                // Logout User A
                cy.getBySel("sidenav-signout").click();
                
                // Login as User B and check for notification
                cy.loginByXstate(ctx.userB.username);
                cy.wait("@getNotifications");
                cy.getBySel("notifications-link").click();
                cy.getBySel("notification-list-item")
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "liked");
            });
        });
        
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            cy.wait("@getNotifications");
            
            // Find a transaction by User B
            cy.database("find", "transactions", { senderId: ctx.userB.id }).then(transaction => {
                // Navigate to that transaction
                cy.visit(`/transaction/${transaction.id}`);
                
                // Comment on the transaction
                cy.getBySel("comment-input").type("This is a test comment");
                cy.getBySel("comment-submit").click();
                cy.wait("@postComment");
                
                // Logout User A
                cy.getBySel("sidenav-signout").click();
                
                // Login as User B
                cy.loginByXstate(ctx.userB.username);
                cy.wait("@getNotifications");
                
                // Check for the notification
                cy.getBySel("notifications-link").click();
                cy.getBySel("notification-list-item")
                    .should("contain", ctx.userA.firstName)
                    .and("contain", "commented");
            });
        });
        
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // Find a transaction between User A and User B
            cy.database("find", "transactions", {
                senderId: ctx.userA.id,
                receiverId: ctx.userB.id
            }).then(transaction => {
                // Login as User C
                cy.loginByXstate(ctx.userC.username);
                cy.wait("@getNotifications");
                
                // Navigate to the transaction
                cy.visit(`/transaction/${transaction.id}`);
                
                // Comment on the transaction
                cy.getBySel("comment-input").type("This is a test comment from User C");
                cy.getBySel("comment-submit").click();
                cy.wait("@postComment");
                
                // Logout User C
                cy.getBySel("sidenav-signout").click();
                
                // Login as User A and check for notification
                cy.loginByXstate(ctx.userA.username);
                cy.wait("@getNotifications");
                cy.getBySel("notifications-link").click();
                cy.getBySel("notification-list-item")
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "commented");
                
                // Logout User A
                cy.getBySel("sidenav-signout").click();
                
                // Login as User B and check for notification
                cy.loginByXstate(ctx.userB.username);
                cy.wait("@getNotifications");
                cy.getBySel("notifications-link").click();
                cy.getBySel("notification-list-item")
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "commented");
            });
        });
        
        it("User A sends a payment to User B", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            cy.wait("@getNotifications");
            
            // Create a new payment to User B
            cy.getBySel("nav-top-new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
            cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
            cy.getBySel("amount-input").type("50");
            cy.getBySel("transaction-create-description-input").type("Test payment");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Logout User A
            cy.getBySel("sidenav-signout").click();
            
            // Login as User B
            cy.loginByXstate(ctx.userB.username);
            cy.wait("@getNotifications");
            
            // Check for the notification
            cy.getBySel("notifications-link").click();
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userA.firstName)
                .and("contain", "paid you");
        });
        
        it("User A sends a payment request to User C", () => {
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            cy.wait("@getNotifications");
            
            // Create a new payment request to User C
            cy.getBySel("nav-top-new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userC.firstName);
            cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();
            cy.getBySel("amount-input").type("75");
            cy.getBySel("transaction-create-description-input").type("Test request");
            cy.getBySel("transaction-create-submit-request").click();
            cy.wait("@createTransaction");
            
            // Logout User A
            cy.getBySel("sidenav-signout").click();
            
            // Login as User C
            cy.loginByXstate(ctx.userC.username);
            cy.wait("@getNotifications");
            
            // Check for the notification
            cy.getBySel("notifications-link").click();
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userA.firstName)
                .and("contain", "requested");
        });
    });
    
    it("renders an empty notifications state", () => {
        // Create a brand new user that won't have notifications
        cy.task("db:seed:user").then((user: User) => {
            // Login as the new user
            cy.loginByXstate(user.username);
            cy.wait("@getNotifications");
            
            // Navigate to notifications
            cy.getBySel("notifications-link").click();
            
            // Verify empty state
            cy.getBySel("empty-list-header").should("be.visible");
            cy.getBySel("empty-list-sub-header").should("be.visible");
        });
    });
});
