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
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
// User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction
it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
// First, create a transaction between User A and User B
cy.loginByXstate(ctx.userA.username);

// Navigate to new transaction page
cy.getBySel("nav-top-new-transaction").click();

// Select User B as recipient
cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();

// Enter transaction details
cy.getBySel("amount-input").type("50");
cy.getBySel("transaction-create-description-input").type("Test transaction for like notification");

// Submit payment
cy.getBySel("transaction-create-submit-payment").click();
cy.wait("@createTransaction");

// Get transaction ID from URL
cy.url().then((url) => {
const transactionId = url.split("/").pop();

// Logout User A
cy.getBySel("sidenav-signout").click();

// Login as User C
cy.loginByXstate(ctx.userC.username);

// Visit the transaction page
cy.visit(`/transaction/${transactionId}`);

// Like the transaction
cy.getBySel("like-button").click();
cy.wait("@postLike");

// Logout User C
cy.getBySel("sidenav-signout").click();

// Login as User A and check notifications
cy.loginByXstate(ctx.userA.username);
cy.visit("/");
cy.wait("@getNotifications");

// Check notification count and content for User A
cy.getBySel("nav-top-notifications-count").should("contain", "1");
cy.getBySel("nav-top-notifications-link").click();
cy.getBySelLike("notification-list-item")
.first()
.should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);

// Logout User A
cy.getBySel("sidenav-signout").click();

// Login as User B and check notifications
cy.loginByXstate(ctx.userB.username);
cy.visit("/");
cy.wait("@getNotifications");

// Check notification count and content for User B
cy.getBySel("nav-top-notifications-count").should("contain", "1");
cy.getBySel("nav-top-notifications-link").click();
cy.getBySelLike("notification-list-item")
.first()
.should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
});
});
 });
    });
});
