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
            cy.loginByXstate(ctx.userA.username)
            cy.visit(`/`)
            cy.getBySel("nav-public-tab").click()
            
            // Find and like User B's transaction
            cy.contains(ctx.userB.username)
                .parents("[data-test*='transaction-item']")
                .find("[data-test*='like-button']")
                .click()
            
            // Login as User B and check notifications
            cy.loginByXstate(ctx.userB.username)
            cy.visit("/notifications")
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userA.username)
                .and("contain", "liked")
        });

        it("User C comments on a transaction between User A and User B; User A and B get notifications", () => {
            cy.loginByXstate(ctx.userC.username)
            cy.visit(`/`)
            cy.getBySel("nav-public-tab").click()
            
            // Find and comment on transaction
            cy.contains(`${ctx.userA.username} paid ${ctx.userB.username}`)
                .parents("[data-test*='transaction-item']")
                .click()
            
            const comment = "Nice transaction!"
            cy.getBySel("comment-input").type(comment)
            cy.getBySel("comment-submit").click()
            
            // Verify User A gets notification
            cy.loginByXstate(ctx.userA.username)
            cy.visit("/notifications")
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userC.username)
                .and("contain", "commented")
            
            // Verify User B gets notification
            cy.loginByXstate(ctx.userB.username)
            cy.visit("/notifications")
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userC.username)
                .and("contain", "commented")
        });

        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/");
            cy.getBySel("nav-public-tab").click();
            
            // Find and like transaction
            cy.contains(`${ctx.userA.username} paid ${ctx.userB.username}`)
                .parents("[data-test*='transaction-item']")
                .find("[data-test*='like-button']")
                .click();
            
            // Verify notifications for both users
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/notifications");
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userC.username)
                .and("contain", "liked");
                
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/notifications");
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userC.username)
                .and("contain", "liked");
        });

        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySel("nav-public-tab").click();
            
            // Find and comment on User B's transaction
            cy.contains(ctx.userB.username)
                .parents("[data-test*='transaction-item']")
                .click();
            
            const comment = "Great transaction!";
            cy.getBySel("comment-input").type(comment);
            cy.getBySel("comment-submit").click();
            cy.wait("@postComment");
            
            // Verify User B gets notification
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/notifications");
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userA.username)
                .and("contain", "commented");
        });

        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/");
            cy.getBySel("nav-public-tab").click();
            
            // Find and comment on transaction between A and B
            cy.contains(`${ctx.userA.username} paid ${ctx.userB.username}`)
                .parents("[data-test*='transaction-item']")
                .click();
            
            const comment = "Interesting payment!";
            cy.getBySel("comment-input").type(comment);
            cy.getBySel("comment-submit").click();
            cy.wait("@postComment");
            
            // Verify User A gets notification
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/notifications");
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userC.username)
                .and("contain", "commented");
            
            // Verify User B gets notification
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/notifications");
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userC.username)
                .and("contain", "commented");
        });

        it("User A sends a payment to User B", () => {
            // Create payment transaction
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySel("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userB.username);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("amount-input").type("50");
            cy.getBySelLike("description-input").type("Test payment");
            cy.getBySelLike("submit-payment").click();
            
            // Verify notification
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/notifications");
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userA.username)
                .and("contain", "paid");
        });
        it("User A sends a payment request to User C", () => {
            // Create payment request
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySel("new-transaction").click();
            cy.getBySelLike("user-list-search-input").type(ctx.userC.username);
            cy.getBySelLike("user-list-item").first().click();
            cy.getBySelLike("amount-input").type("75");
            cy.getBySelLike("description-input").type("Test request");
            cy.getBySelLike("submit-request").click();
            
            // Verify notification
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/notifications");
            cy.getBySel("notification-list-item")
                .should("contain", ctx.userA.username)
                .and("contain", "requested");
        });
    });
    it("renders an empty notifications state", () => {
        // Find a user that has no notifications
        cy.database("find", "users").then((users: User[]) => {
            const emptyNotificationsUser = users.find(user => 
                user.firstName === "Empty" && user.lastName === "NotificationsUser"
            ) || users[0];
                
            cy.loginByXstate(emptyNotificationsUser.username);
            cy.visit("/notifications");
            cy.getBySel("empty-list-header").should("exist");
            cy.getBySel("empty-list-subheader").should("exist");
        });
    });
});
