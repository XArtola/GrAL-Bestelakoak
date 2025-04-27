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
            // Log in as User B
            cy.loginByXstate(ctx.userB.username);
            
            // Create a payment transaction that will be liked
            cy.getBySelLike("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userC.firstName);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("amount-input").type("5");
            cy.getBySelLike("description-input").type("Coffee");
            cy.getBySelLike("submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction ID from the URL
            cy.url().then((url) => {
                const transactionId = url.split("/").pop();
                
                // Log out User B
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User A
                cy.loginByXstate(ctx.userA.username);
                
                // Navigate to User B's transaction and like it
                cy.visit(`/transaction/${transactionId}`);
                cy.getBySel("transaction-like-button").click();
                
                // Log out User A
                cy.getBySel("sidenav-signout").click();
                
                // Log back in as User B
                cy.loginByXstate(ctx.userB.username);
                
                // Check for notifications
                cy.getBySel("nav-top-notifications-count").should("exist");
                cy.getBySel("nav-top-notifications-button").click();
                
                // Verify the notification content
                cy.getBySel("notification-list-item")
                    .first()
                    .should("contain", ctx.userA.firstName)
                    .and("contain", "liked");
            });
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // Log in as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a payment transaction to User B
            cy.getBySelLike("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userB.firstName);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("amount-input").type("10");
            cy.getBySelLike("description-input").type("Lunch");
            cy.getBySelLike("submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction ID from the URL
            cy.url().then((url) => {
                const transactionId = url.split("/").pop();
                
                // Log out User A
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User C
                cy.loginByXstate(ctx.userC.username);
                
                // Navigate to the transaction and like it
                cy.visit(`/transaction/${transactionId}`);
                cy.getBySel("transaction-like-button").click();
                
                // Log out User C
                cy.getBySel("sidenav-signout").click();
                
                // Log back in as User A and check for notification
                cy.loginByXstate(ctx.userA.username);
                cy.getBySel("nav-top-notifications-count").should("exist");
                cy.getBySel("nav-top-notifications-button").click();
                cy.getBySel("notification-list-item")
                    .first()
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "liked");
                
                // Log out User A
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User B and check for notification
                cy.loginByXstate(ctx.userB.username);
                cy.getBySel("nav-top-notifications-count").should("exist");
                cy.getBySel("nav-top-notifications-button").click();
                cy.getBySel("notification-list-item")
                    .first()
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "liked");
            });
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // Log in as User B
            cy.loginByXstate(ctx.userB.username);
            
            // Create a payment transaction that will receive a comment
            cy.getBySelLike("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userC.firstName);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("amount-input").type("15");
            cy.getBySelLike("description-input").type("Movie tickets");
            cy.getBySelLike("submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction ID from the URL
            cy.url().then((url) => {
                const transactionId = url.split("/").pop();
                
                // Log out User B
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User A
                cy.loginByXstate(ctx.userA.username);
                
                // Navigate to User B's transaction and comment on it
                cy.visit(`/transaction/${transactionId}`);
                const comment = "Great movie!";
                cy.getBySel("transaction-comment-input").type(comment);
                cy.getBySel("transaction-comment-submit").click();
                cy.wait("@postComment");
                
                // Log out User A
                cy.getBySel("sidenav-signout").click();
                
                // Log back in as User B
                cy.loginByXstate(ctx.userB.username);
                
                // Check for notifications
                cy.getBySel("nav-top-notifications-count").should("exist");
                cy.getBySel("nav-top-notifications-button").click();
                
                // Verify the notification content
                cy.getBySel("notification-list-item")
                    .first()
                    .should("contain", ctx.userA.firstName)
                    .and("contain", "commented");
            });
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // Log in as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a payment transaction to User B
            cy.getBySelLike("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userB.firstName);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("amount-input").type("20");
            cy.getBySelLike("description-input").type("Dinner");
            cy.getBySelLike("submit-payment").click();
            cy.wait("@createTransaction");
            
            // Get the transaction ID from the URL
            cy.url().then((url) => {
                const transactionId = url.split("/").pop();
                
                // Log out User A
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User C
                cy.loginByXstate(ctx.userC.username);
                
                // Navigate to the transaction and comment on it
                cy.visit(`/transaction/${transactionId}`);
                const comment = "Looks delicious!";
                cy.getBySel("transaction-comment-input").type(comment);
                cy.getBySel("transaction-comment-submit").click();
                cy.wait("@postComment");
                
                // Log out User C
                cy.getBySel("sidenav-signout").click();
                
                // Log back in as User A and check for notification
                cy.loginByXstate(ctx.userA.username);
                cy.getBySel("nav-top-notifications-count").should("exist");
                cy.getBySel("nav-top-notifications-button").click();
                cy.getBySel("notification-list-item")
                    .first()
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "commented");
                    
                // Log out User A
                cy.getBySel("sidenav-signout").click();
                
                // Log in as User B and check for notification
                cy.loginByXstate(ctx.userB.username);
                cy.getBySel("nav-top-notifications-count").should("exist");
                cy.getBySel("nav-top-notifications-button").click();
                cy.getBySel("notification-list-item")
                    .first()
                    .should("contain", ctx.userC.firstName)
                    .and("contain", "commented");
            });
        });
        it("User A sends a payment to User B", () => {
            // Log in as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a payment transaction to User B
            cy.getBySelLike("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userB.firstName);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("amount-input").type("25");
            cy.getBySelLike("description-input").type("Payment test");
            cy.getBySelLike("submit-payment").click();
            cy.wait("@createTransaction");
            
            // Log out User A
            cy.getBySel("sidenav-signout").click();
            
            // Log in as User B
            cy.loginByXstate(ctx.userB.username);
            
            // Check for notifications
            cy.getBySel("nav-top-notifications-count").should("exist");
            cy.getBySel("nav-top-notifications-button").click();
            
            // Verify payment notification
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userA.firstName)
                .and("contain", "paid you");
        });
        it("User A sends a payment request to User C", () => {
            // Log in as User A
            cy.loginByXstate(ctx.userA.username);
            
            // Create a request transaction to User C
            cy.getBySelLike("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userC.firstName);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("request-tab").click();
            cy.getBySelLike("amount-input").type("30");
            cy.getBySelLike("description-input").type("Request test");
            cy.getBySelLike("submit-request").click();
            cy.wait("@createTransaction");
            
            // Log out User A
            cy.getBySel("sidenav-signout").click();
            
            // Log in as User C
            cy.loginByXstate(ctx.userC.username);
            
            // Check for notifications
            cy.getBySel("nav-top-notifications-count").should("exist");
            cy.getBySel("nav-top-notifications-button").click();
            
            // Verify request notification
            cy.getBySel("notification-list-item")
                .first()
                .should("contain", ctx.userA.firstName)
                .and("contain", "requested");
        });
    });
    it("renders an empty notifications state", () => {
        // Create a random username to ensure no notifications
        const randomUser = `user-${Math.random().toString().substring(2, 8)}`;
        
        // Create new user
        cy.visit("/signup");
        cy.getBySel("signup-first-name").type("Test");
        cy.getBySel("signup-last-name").type("User");
        cy.getBySel("signup-username").type(randomUser);
        cy.getBySel("signup-password").type("s3cret");
        cy.getBySel("signup-confirmPassword").type("s3cret");
        cy.getBySel("signup-submit").click();
        cy.wait("@signup");
        
        // Skip onboarding
        cy.getBySel("user-onboarding-next").click();
        cy.getBySel("user-onboarding-skip").click();
        cy.getBySel("user-onboarding-next").click();
        
        // Open notifications
        cy.getBySel("nav-top-notifications-button").click();
        
        // Verify empty state
        cy.getBySel("empty-list-header").should("contain", "No Notifications");
    });
});
