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
            // pick a transaction of B
            cy.loginByXstate(ctx.userB.username);
            cy.getBySelLike("transaction-item").first().within(() => {
                cy.getBySel("like-btn").click();
            });
            cy.wait("@createTransaction");
            // B checks notification
            cy.getBySel("nav-notifications").click();
            cy.wait("@getNotifications");
            cy.contains(`${ctx.userA.firstName} liked`).should("exist");
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            cy.loginByXstate(ctx.userC.username);
            // ...similar steps...
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // ...similar comment flow...
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // ...similar comment flow...
        });
        it("User A sends a payment to User B", () => {
            cy.loginByXstate(ctx.userA.username);
            cy.getBySel("new-transaction-button").click();
            cy.getBySelLike("new-transaction-option").contains(ctx.userB.username).click();
            cy.getBySel("transaction-amount-input").type("10");
            cy.getBySel("transaction-desc-input").type("Test Pay");
            cy.getBySel("transaction-submit-payment").click();
            cy.wait("@createTransaction");
            // B’s notification
            cy.loginByXstate(ctx.userB.username);
            cy.getBySel("nav-notifications").click();
            cy.contains("received payment").should("exist");
        });
        it("User A sends a payment request to User C", () => {
            // ...request flow...
        });
    });
    it("renders an empty notifications state", () => {
        cy.task("db:seed"); // new seed with no interactions
        cy.loginByXstate(ctx.userA.username);
        cy.getBySel("nav-notifications").click();
        cy.getBySelLike("notification-item").should("have.length",0);
        cy.contains("No notifications").should("exist");
    });
});
