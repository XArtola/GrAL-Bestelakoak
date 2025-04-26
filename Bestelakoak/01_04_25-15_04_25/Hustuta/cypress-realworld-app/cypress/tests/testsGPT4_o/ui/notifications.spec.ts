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
            // User A likes a transaction of User B and verify notification
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/transactions");
            cy.get(".transaction-item").first().find(".like-button").click();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/notifications");
            cy.contains(`${ctx.userA.firstName} liked your transaction`).should("be.visible");
        });

        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // User C likes a transaction and verify notifications for User A and User B
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/transactions");
            cy.get(".transaction-item").first().find(".like-button").click();
            [ctx.userA, ctx.userB].forEach(user => {
                cy.loginByXstate(user.username);
                cy.visit("/notifications");
                cy.contains(`${ctx.userC.firstName} liked a transaction`).should("be.visible");
            });
        });

        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // User A comments on a transaction and verify notification for User B
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/transactions");
            cy.get(".transaction-item").first().find(".comment-button").click();
            cy.get("textarea").type("Great transaction!");
            cy.get("button[type='submit']").click();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/notifications");
            cy.contains(`${ctx.userA.firstName} commented on your transaction`).should("be.visible");
        });

        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // User C comments on a transaction and verify notifications for User A and User B
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/transactions");
            cy.get(".transaction-item").first().find(".comment-button").click();
            cy.get("textarea").type("Interesting transaction!");
            cy.get("button[type='submit']").click();
            [ctx.userA, ctx.userB].forEach(user => {
                cy.loginByXstate(user.username);
                cy.visit("/notifications");
                cy.contains(`${ctx.userC.firstName} commented on a transaction`).should("be.visible");
            });
        });

        it("User A sends a payment to User B", () => {
            // User A sends a payment to User B and verify notification
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/new-transaction");
            cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
            cy.get("#amount").type("50");
            cy.get("#description").type("Payment for services");
            cy.get("button[type='submit']").click();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/notifications");
            cy.contains(`${ctx.userA.firstName} sent you a payment`).should("be.visible");
        });

        it("User A sends a payment request to User C", () => {
            // User A sends a payment request to User C and verify notification
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/new-transaction");
            cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();
            cy.get("#amount").type("75");
            cy.get("#description").type("Request for payment");
            cy.get("button[type='submit']").click();
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/notifications");
            cy.contains(`${ctx.userA.firstName} requested a payment`).should("be.visible");
        });
    });

    it("renders an empty notifications state", () => {
        // Verify the empty state for notifications
        cy.loginByXstate(ctx.userA.username);
        cy.visit("/notifications");
        cy.contains("You have no notifications").should("be.visible");
    });
});
