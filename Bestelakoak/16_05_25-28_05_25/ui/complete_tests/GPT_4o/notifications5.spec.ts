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
// Log in as User A
cy.loginByXstate(ctx.userA.username);

// Navigate to the new transaction page
cy.getBySel("nav-top-new-transaction").click();

// Select User B from the user list
cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();

// Enter payment details
cy.getBySel("amount-input").type("50");
cy.getBySel("transaction-create-description-input").type("Dinner payment");

// Submit the payment
cy.getBySel("transaction-create-submit-payment").click();
cy.wait("@createTransaction");

// Log out User A
cy.getBySel("sidenav-signout").click();

// Log in as User B
cy.loginByXstate(ctx.userB.username);

// Check for notifications
cy.getBySel("sidenav-notifications").click();
cy.wait("@getNotifications");

// Verify the notification about the payment exists
cy.getBySel("notification-list-item")
.first()
.should("contain", ctx.userA.firstName)
.and("contain", "paid you");
 });
    });
});
