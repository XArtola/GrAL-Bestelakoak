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
            // User A likes a transaction of User B; User B gets notification that User A liked transaction
            // User A logs in and likes User B's transaction
            cy.loginByXstate(ctx.userA.username);
            cy.visit('/');
            cy.get('[data-test="transaction-item"]').contains(ctx.userB.firstName).first().click();
            cy.get('[data-test="transaction-like-button"]').click();
            // User B logs in and checks notifications
            cy.loginByXstate(ctx.userB.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userA.firstName).and('contain', 'liked');
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction
            cy.loginByXstate(ctx.userC.username);
            cy.visit('/');
            cy.get('[data-test="transaction-item"]').contains(ctx.userA.firstName).contains(ctx.userB.firstName).first().click();
            cy.get('[data-test="transaction-like-button"]').click();
            // User A checks notifications
            cy.loginByXstate(ctx.userA.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userC.firstName).and('contain', 'liked');
            // User B checks notifications
            cy.loginByXstate(ctx.userB.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userC.firstName).and('contain', 'liked');
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // User A comments on a transaction of User B; User B gets notification that User A commented on their transaction
            cy.loginByXstate(ctx.userA.username);
            cy.visit('/');
            cy.get('[data-test="transaction-item"]').contains(ctx.userB.firstName).first().click();
            cy.get('[data-test="transaction-comment-input"]').type('Great job!{enter}');
            // User B checks notifications
            cy.loginByXstate(ctx.userB.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userA.firstName).and('contain', 'commented');
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction
            cy.loginByXstate(ctx.userC.username);
            cy.visit('/');
            cy.get('[data-test="transaction-item"]').contains(ctx.userA.firstName).contains(ctx.userB.firstName).first().click();
            cy.get('[data-test="transaction-comment-input"]').type('Nice!{enter}');
            // User A checks notifications
            cy.loginByXstate(ctx.userA.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userC.firstName).and('contain', 'commented');
            // User B checks notifications
            cy.loginByXstate(ctx.userB.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userC.firstName).and('contain', 'commented');
        });
        it("User A sends a payment to User B", () => {
            // User A sends a payment to User B
            cy.loginByXstate(ctx.userA.username);
            cy.visit('/');
            cy.get('[data-test="new-transaction"]').click();
            cy.get('[data-test="user-list-item"]').contains(ctx.userB.firstName).click();
            cy.get('[data-test="transaction-create-amount-input"]').type('50');
            cy.get('[data-test="transaction-create-description-input"]').type('Payment for dinner');
            cy.get('[data-test="transaction-create-submit-payment"]').click();
            // User B checks notifications
            cy.loginByXstate(ctx.userB.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userA.firstName).and('contain', 'paid');
        });
        it("User A sends a payment request to User C", () => {
            // User A sends a payment request to User C
            cy.loginByXstate(ctx.userA.username);
            cy.visit('/');
            cy.get('[data-test="new-transaction"]').click();
            cy.get('[data-test="user-list-item"]').contains(ctx.userC.firstName).click();
            cy.get('[data-test="transaction-create-amount-input"]').type('75');
            cy.get('[data-test="transaction-create-description-input"]').type('Request for groceries');
            cy.get('[data-test="transaction-create-submit-request"]').click();
            // User C checks notifications
            cy.loginByXstate(ctx.userC.username);
            cy.visit('/notifications');
            cy.get('[data-test="notification-list"]').should('contain', ctx.userA.firstName).and('contain', 'requested');
        });
    });
    it("renders an empty notifications state", () => {
        // renders an empty notifications state
        cy.task('db:seed', { notifications: [] });
        cy.visit('/notifications');
        cy.get('[data-test="notification-list"]').should('not.exist');
        cy.get('[data-test="notifications-empty"]').should('be.visible');
    });
});
