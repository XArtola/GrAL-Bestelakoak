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
            cy.loginByXstate(ctx.userA.username);
            cy.getBySel("transaction-item").first().click();
            cy.getBySel("like-button").click();
            cy.getBySel("sidenav-signout").click();
            cy.loginByXstate(ctx.userB.username);
            cy.getBySel("sidenav-notifications").click();
            cy.getBySel("notification-list").should("contain", ctx.userA.firstName);
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction
            cy.loginByXstate(ctx.userC.username);
            cy.getBySel("transaction-item").first().click();
            cy.getBySel("like-button").click();
            cy.getBySel("sidenav-signout").click();
            [ctx.userA, ctx.userB].forEach((user) => {
                cy.loginByXstate(user.username);
                cy.getBySel("sidenav-notifications").click();
                cy.getBySel("notification-list").should("contain", ctx.userC.firstName);
                cy.getBySel("sidenav-signout").click();
            });
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // User A comments on a transaction of User B; User B gets notification that User A commented on their transaction
            cy.loginByXstate(ctx.userA.username);
            cy.getBySel("transaction-item").first().click();
            cy.getBySel("comment-input").type("Great job!{enter}");
            cy.getBySel("sidenav-signout").click();
            cy.loginByXstate(ctx.userB.username);
            cy.getBySel("sidenav-notifications").click();
            cy.getBySel("notification-list").should("contain", ctx.userA.firstName);
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction
            cy.loginByXstate(ctx.userC.username);
            cy.getBySel("transaction-item").first().click();
            cy.getBySel("comment-input").type("Nice!{enter}");
            cy.getBySel("sidenav-signout").click();
            [ctx.userA, ctx.userB].forEach((user) => {
                cy.loginByXstate(user.username);
                cy.getBySel("sidenav-notifications").click();
                cy.getBySel("notification-list").should("contain", ctx.userC.firstName);
                cy.getBySel("sidenav-signout").click();
            });
        });
        it("User A sends a payment to User B", () => {
            // User A sends a payment to User B
            cy.loginByXstate(ctx.userA.username);
            cy.getBySelLike("new-transaction").click();
            cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
            cy.getBySel("amount-input").type("50");
            cy.getBySel("transaction-create-description-input").type("Dinner");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            cy.getBySel("sidenav-signout").click();
            cy.loginByXstate(ctx.userB.username);
            cy.getBySel("sidenav-notifications").click();
            cy.getBySel("notification-list").should("contain", ctx.userA.firstName);
        });
        it("User A sends a payment request to User C", () => {
            // User A sends a payment request to User C
            cy.loginByXstate(ctx.userA.username);
            cy.getBySelLike("new-transaction").click();
            cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();
            cy.getBySel("amount-input").type("75");
            cy.getBySel("transaction-create-description-input").type("Concert tickets");
            cy.getBySel("transaction-create-submit-request").click();
            cy.wait("@createTransaction");
            cy.getBySel("sidenav-signout").click();
            cy.loginByXstate(ctx.userC.username);
            cy.getBySel("sidenav-notifications").click();
            cy.getBySel("notification-list").should("contain", ctx.userA.firstName);
        });
    });
    it("renders an empty notifications state", () => {
        // renders an empty notifications state
        cy.task("db:seed");
        cy.database("find", "users").then((user: User) => {
            cy.loginByXstate(user.username);
            cy.getBySel("sidenav-notifications").click();
            cy.getBySel("notification-list").should("not.exist");
            cy.contains("No notifications").should("be.visible");
        });
    });
});
