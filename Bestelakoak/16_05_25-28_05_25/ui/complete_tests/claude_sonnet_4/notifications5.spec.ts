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
        it("User A sends a payment to User B", () => {
// User A sends a payment to User B
cy.loginByXstate(ctx.userA.username);

// Navigate to create new transaction
cy.getBySel("new-transaction").click();

// Search for and select User B
cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
cy.getBySel("user-list-item").first().click();

// Enter payment amount and description
cy.getBySel("amount-input").type("50");
cy.getBySel("transaction-create-description-input").type("Payment from A to B");

// Submit the payment
cy.getBySel("transaction-create-submit-payment").click();
cy.wait("@createTransaction");

// Logout User A
cy.getBySel("sidenav-signout").click();

// Login as User B to check notifications
cy.loginByXstate(ctx.userB.username);

// Navigate to notifications
cy.getBySel("nav-top-notifications-count").should("exist");
cy.getBySel("sidenav-notifications").click();
cy.wait("@getNotifications");

// Verify User B received notification about the payment
cy.getBySel("notification-list-item")
.first()
.should("contain", ctx.userA.firstName)
.and("contain", "paid");
 });
    });
});
