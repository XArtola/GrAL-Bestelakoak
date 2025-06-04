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
// Login as User A

cy.loginByXstate(ctx.userA.username);

cy.wait("@getNotifications");



// Create new payment transaction to User B

cy.getBySel("nav-top-new-transaction").click();

cy.getBySel("user-list-search-input").type(ctx.userB.firstName);

cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();



// Fill payment details

cy.getBySel("amount-input").type("50");

cy.getBySel("transaction-create-description-input").type("Payment from A to B");

cy.getBySel("transaction-create-submit-payment").click();



// Wait for transaction creation

cy.wait("@createTransaction");



// Logout User A

cy.getBySel("sidenav-signout").click();



// Login as User B to check notification

cy.loginByXstate(ctx.userB.username);

cy.wait("@getNotifications");



// Verify notification

cy.getBySel("nav-top-notifications-count").should("exist");

cy.getBySel("nav-top-notifications-link").click();



// Check notification content

cy.getBySel("notification-list-item")

.first()

.should("contain", ctx.userA.firstName)

.and("contain", "paid");


 });
    });
});
