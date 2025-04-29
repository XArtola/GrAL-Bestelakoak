import { isMobile } from "../../support/utils";
import { User, Transaction } from "../../../src/models";
import Dinero from "dinero.js";

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
        cy.intercept("POST", "/likes/*").as("postLike"); // Added intercept for likes

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
            // Find a transaction where User B is the sender or receiver
            cy.database("find", "transactions", { $or: [{ senderId: ctx.userB.id }, { receiverId: ctx.userB.id }] }).then(
                (transaction: Transaction) => {
                    // Visit the transaction detail page
                    cy.visit(`/transaction/${transaction.id}`);
                    // Like the transaction
                    cy.getBySelLike("like-button").click();
                    cy.wait("@postLike");
                }
            );
            // Switch to User B
            cy.switchUser(ctx.userB.username);
            // Visit the app root
            cy.visit("/");
            // Wait for notifications to load
            cy.wait("@getNotifications");
            // Assert notification count badge shows 1
            cy.getBySel("nav-top-notifications-count").should("contain", "1");
            // Click notifications link
            cy.getBySel("nav-top-notifications-link").click();
            // Assert the notification text is correct
            cy.getBySelLike("notification-list-item")
                .first()
                .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} liked your transaction`);
        });

        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // Find a transaction between User A and User B
            cy.database("find", "transactions", { senderId: ctx.userA.id, receiverId: ctx.userB.id }).then(
                (transaction: Transaction) => {
                    // Login as User C
                    cy.loginByXstate(ctx.userC.username);
                    // Visit the transaction detail page
                    cy.visit(`/transaction/${transaction.id}`);
                    // Like the transaction
                    cy.getBySelLike("like-button").click();
                    cy.wait("@postLike");

                    // Check User A's notifications
                    cy.switchUser(ctx.userA.username);
                    cy.visit("/");
                    cy.wait("@getNotifications");
                    cy.getBySel("nav-top-notifications-count").should("contain", "1");
                    cy.getBySel("nav-top-notifications-link").click();
                    cy.getBySelLike("notification-list-item")
                        .first()
                        .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);

                    // Check User B's notifications
                    cy.switchUser(ctx.userB.username);
                    cy.visit("/");
                    cy.wait("@getNotifications");
                    cy.getBySel("nav-top-notifications-count").should("contain", "1");
                    cy.getBySel("nav-top-notifications-link").click();
                    cy.getBySelLike("notification-list-item")
                        .first()
                        .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
                }
            );
        });

        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            const commentText = "Test comment from User A";
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            // Find a transaction where User B is the sender or receiver
            cy.database("find", "transactions", { $or: [{ senderId: ctx.userB.id }, { receiverId: ctx.userB.id }] }).then(
                (transaction: Transaction) => {
                    // Visit the transaction detail page
                    cy.visit(`/transaction/${transaction.id}`);
                    // Post a comment
                    cy.getBySel("comment-input").type(`${commentText}{enter}`);
                    cy.wait("@postComment");
                }
            );
            // Switch to User B
            cy.switchUser(ctx.userB.username);
            // Visit the app root
            cy.visit("/");
            // Wait for notifications to load
            cy.wait("@getNotifications");
            // Assert notification count badge shows 1
            cy.getBySel("nav-top-notifications-count").should("contain", "1");
            // Click notifications link
            cy.getBySel("nav-top-notifications-link").click();
            // Assert the notification text is correct
            cy.getBySelLike("notification-list-item")
                .first()
                .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} commented on your transaction`);
        });

        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            const commentText = "Test comment from User C";
            // Find a transaction between User A and User B
            cy.database("find", "transactions", { senderId: ctx.userA.id, receiverId: ctx.userB.id }).then(
                (transaction: Transaction) => {
                    // Login as User C
                    cy.loginByXstate(ctx.userC.username);
                    // Visit the transaction detail page
                    cy.visit(`/transaction/${transaction.id}`);
                    // Post a comment
                    cy.getBySel("comment-input").type(`${commentText}{enter}`);
                    cy.wait("@postComment");

                    // Check User A's notifications
                    cy.switchUser(ctx.userA.username);
                    cy.visit("/");
                    cy.wait("@getNotifications");
                    cy.getBySel("nav-top-notifications-count").should("contain", "1");
                    cy.getBySel("nav-top-notifications-link").click();
                    cy.getBySelLike("notification-list-item")
                        .first()
                        .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);

                    // Check User B's notifications
                    cy.switchUser(ctx.userB.username);
                    cy.visit("/");
                    cy.wait("@getNotifications");
                    cy.getBySel("nav-top-notifications-count").should("contain", "1");
                    cy.getBySel("nav-top-notifications-link").click();
                    cy.getBySelLike("notification-list-item")
                        .first()
                        .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
                }
            );
        });

        it("User A sends a payment to User B", () => {
            const paymentAmount = 50;
            const paymentNote = "Payment for lunch";
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            // Make a payment to User B
            cy.makePayment(ctx.userB.id, paymentAmount, paymentNote);
            // Wait for transaction creation
            cy.wait("@createTransaction");
            // Switch to User B
            cy.switchUser(ctx.userB.username);
            // Visit the app root
            cy.visit("/");
            // Wait for notifications to load
            cy.wait("@getNotifications");
            // Assert notification count badge shows 1
            cy.getBySel("nav-top-notifications-count").should("contain", "1");
            // Click notifications link
            cy.getBySel("nav-top-notifications-link").click();
            // Assert the notification text is correct
            cy.getBySelLike("notification-list-item")
                .first()
                .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} paid you`)
                .and("contain", Dinero({ amount: paymentAmount * 100 }).toFormat("$0,0.00"));
        });

        it("User A sends a payment request to User C", () => {
            const requestAmount = 75;
            const requestNote = "Money for tickets";
            // Login as User A
            cy.loginByXstate(ctx.userA.username);
            // Request payment from User C
            cy.requestPayment(ctx.userC.id, requestAmount, requestNote);
            // Wait for transaction creation
            cy.wait("@createTransaction");
            // Switch to User C
            cy.switchUser(ctx.userC.username);
            // Visit the app root
            cy.visit("/");
            // Wait for notifications to load
            cy.wait("@getNotifications");
            // Assert notification count badge shows 1
            cy.getBySel("nav-top-notifications-count").should("contain", "1");
            // Click notifications link
            cy.getBySel("nav-top-notifications-link").click();
            // Assert the notification text is correct
            cy.getBySelLike("notification-list-item")
                .first()
                .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} requested payment`)
                .and("contain", Dinero({ amount: requestAmount * 100 }).toFormat("$0,0.00"));
        });
    });

    it("renders an empty notifications state", () => {
        // Login as User A
        cy.loginByXstate(ctx.userA.username);
        // Mark all notifications as read in the database for User A
        cy.database("update", "notifications", { userId: ctx.userA.id }, { isRead: true });
        // Visit the app root
        cy.visit("/");
        // Wait for notifications to load
        cy.wait("@getNotifications");
        // Assert notification count badge does not exist
        cy.getBySel("nav-top-notifications-count").should("not.exist");
        // Click notifications link
        cy.getBySel("nav-top-notifications-link").click();
        // Assert the list is empty
        cy.getBySel("notification-list").should("not.exist");
        cy.getBySel("empty-list-header").should("be.visible").and("contain", "No Notifications");
    });
});
