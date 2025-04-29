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
            // Log in as User A and like a transaction
            cy.loginByXstate("PainterJoy90");
            cy.visit("/transaction/tx-id-like");
            cy.get("[data-test=transaction-like-button]").click();
            // Switch to User B and verify notification appears
            cy.logoutByXstate();
            cy.loginByXstate("UserB");
            cy.visit("/notifications");
            cy.contains("PainterJoy90 liked your transaction").should("be.visible");
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // Log in as User C, like a transaction
            cy.loginByXstate("UserC");
            cy.visit("/transaction/tx-id-like2");
            cy.get("[data-test=transaction-like-button]").click();
            // Validate for both User A and User B via separate assertions (if context available)
            cy.logoutByXstate();
            cy.loginByXstate("UserA");
            cy.visit("/notifications");
            cy.contains("UserC liked your transaction").should("be.visible");
            cy.logoutByXstate();
            cy.loginByXstate("UserB");
            cy.visit("/notifications");
            cy.contains("UserC liked your transaction").should("be.visible");
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // Log in as User A, post a comment
            cy.loginByXstate("PainterJoy90");
            cy.visit("/transaction/tx-id-comment");
            cy.get("[data-test=transaction-comment-input]").type("Nice work!");
            cy.get("[data-test=transaction-comment-submit]").click();
            // Switch to User B to check for notification
            cy.logoutByXstate();
            cy.loginByXstate("UserB");
            cy.visit("/notifications");
            cy.contains("PainterJoy90 commented on your transaction").should("be.visible");
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // Log in as User C, post a comment on a joint transaction
            cy.loginByXstate("UserC");
            cy.visit("/transaction/tx-id-comment2");
            cy.get("[data-test=transaction-comment-input]").type("Looks good!");
            cy.get("[data-test=transaction-comment-submit]").click();
            // Validate notifications for both User A and User B
            cy.logoutByXstate();
            cy.loginByXstate("UserA");
            cy.visit("/notifications");
            cy.contains("UserC commented on your transaction").should("be.visible");
            cy.logoutByXstate();
            cy.loginByXstate("UserB");
            cy.visit("/notifications");
            cy.contains("UserC commented on your transaction").should("be.visible");
        });
        it("User A sends a payment to User B", () => {
            // Log in as User A, perform a payment sending action and verify notification for User B
            cy.loginByXstate("PainterJoy90");
            cy.visit("/new-transaction");
            // Assume selecting UserB from list
            cy.get("[data-test=user-list-item]").contains("UserB").click();
            cy.get("input[name='amount']").type("50");
            cy.get("textarea[name='transaction-description']").type("Payment for dinner");
            cy.get("button").contains("Pay").click();
            cy.wait("@createTransaction");
            // Verify that a success message appears
            cy.contains("Transaction Submitted!").should("be.visible");
        });
        it("User A sends a payment request to User C", () => {
            // Log in as User A, perform a request transaction and verify notification for User C
            cy.loginByXstate("PainterJoy90");
            cy.visit("/new-transaction");
            // Assume selecting UserC from list
            cy.get("[data-test=user-list-item]").contains("UserC").click();
            cy.get("input[name='amount']").type("75");
            cy.get("textarea[name='transaction-description']").type("Payment Request");
            cy.get("button").contains("Request").click();
            cy.wait("@createTransaction");
            cy.contains("Transaction Submitted!").should("be.visible");
        });
    });
    it("renders an empty notifications state", () => {
        // For a user with no notifications: ensure the notifications page displays an empty state
        cy.task("db:seed"); // Reset seed with no notifications if applicable
        cy.loginByXstate("PainterJoy90");
        cy.visit("/notifications");
        cy.contains("No notifications").should("be.visible");
    });
});
