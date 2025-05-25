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
        it("User A sends a payment request to User C", () => {
// User A sends a payment request to User C
it("User A sends a payment request to User C", () => {
// Login as User A
cy.loginByXstate(ctx.userA.username);

// Navigate to create new transaction
cy.getBySel("new-transaction").click();

// Search for and select User C
cy.getBySel("user-list-search-input").type(ctx.userC.firstName);
cy.getBySel("user-list-item").first().click();

// Enter transaction details for a request
cy.getBySel("amount-input").type("75");
cy.getBySel("transaction-create-description-input").type("Payment request from A to C");

// Submit the payment request
cy.getBySel("transaction-create-submit-request").click();

// Wait for the transaction to be created
cy.wait("@createTransaction");

// Switch to User C to verify notification
cy.loginByXstate(ctx.userC.username);

// Navigate to notifications
cy.visit("/notifications");
cy.wait("@getNotifications");

// Verify that User C received a notification about the payment request
cy.getBySel("notification-list-item")
.should("contain", ctx.userA.firstName)
.and("contain", "requested");

// Verify notification count is updated
cy.getBySel("nav-top-notifications-count").should("exist");
});
 });
    });
});
