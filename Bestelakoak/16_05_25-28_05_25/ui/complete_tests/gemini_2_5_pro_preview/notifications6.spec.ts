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
// Log in as User A
cy.loginByXstate(ctx.userA.username);

// Navigate to the new transaction page
cy.getBySel("new-transaction").click();

// Select User C from the list
cy.getBySelLike("user-list-search-input").type(ctx.userC.username);
cy.getBySelLike("user-list-item").first().click();

// Enter amount and description for the request
cy.getBySelLike("amount-input").type("50");
cy.getBySelLike("description-input").type("Payment request for dinner");

// Click on the request button
cy.getBySelLike("submit-request").click();
cy.wait("@createTransaction");

// Log out User A
cy.getBySel("sidenav-signout").click();

// Log in as User C
cy.loginByXstate(ctx.userC.username);

// Navigate to notifications page
cy.getBySel("sidenav-notifications").click();
cy.wait("@getNotifications");

// Verify notification from User A is present
cy.getBySel("notification-list-item")
.should("be.visible")
.and("contain", ctx.userA.firstName)
.and("contain", "requested payment");
 });
    });
});
