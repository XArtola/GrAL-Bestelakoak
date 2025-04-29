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
    // notifications from user interactions
    describe("notifications from user interactions", function () {
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => {
            // <generated_code>
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySel("nav-public-tab").click();
            cy.getBySelLike("transaction-item").first().click();
            cy.getBySel("like-button").click();
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            // </generated_code>
        });

        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // <generated_code>
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/");
            cy.getBySel("nav-public-tab").click();
            cy.getBySelLike("transaction-item").first().click();
            cy.getBySel("like-button").click();
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            // </generated_code>
        });

        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // <generated_code>
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySel("nav-public-tab").click();
            cy.getBySelLike("transaction-item").first().click();
            cy.getBySel("comment-input").type("Test comment");
            cy.getBySel("comment-submit").click();
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            // </generated_code>
        });

        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // <generated_code>
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/");
            cy.getBySel("nav-public-tab").click();
            cy.getBySelLike("transaction-item").first().click();
            cy.getBySel("comment-input").type("Test comment");
            cy.getBySel("comment-submit").click();
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            // </generated_code>
        });

        it("User A sends a payment to User B", () => {
            // <generated_code>
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySelLike("new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userB.username);
            cy.wait(500);
            cy.getBySelLike("user-item").first().click();
            cy.getBySel("transaction-amount-input").type("50");
            cy.getBySel("transaction-description-input").type("Test payment");
            cy.getBySel("payment-send-button").click();
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userB.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            // </generated_code>
        });

        it("User A sends a payment request to User C", () => {
            // <generated_code>
            cy.loginByXstate(ctx.userA.username);
            cy.visit("/");
            cy.getBySelLike("new-transaction").click();
            cy.getBySel("user-list-search-input").type(ctx.userC.username);
            cy.wait(500);
            cy.getBySelLike("user-item").first().click();
            cy.getBySel("transaction-amount-input").type("75");
            cy.getBySel("transaction-description-input").type("Test request");
            cy.getBySel("request-money").click();
            cy.logoutByXstate();
            cy.loginByXstate(ctx.userC.username);
            cy.visit("/");
            cy.getBySel("notification-count").should("contain", "1");
            // </generated_code>
        });
    });

    // renders an empty notifications state
    it("renders an empty notifications state", () => {
        // <generated_code>
        cy.loginByXstate(ctx.userA.username);
        cy.visit("/");
        cy.getBySel("notification-bell").click();
        cy.wait("@getNotifications");
        cy.getBySel("empty-notifications").should("be.visible");
        // </generated_code>
    });
});
