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



// Navigate to new transaction

cy.getBySel("nav-top-new-transaction").click();



// Search for and select User B

cy.getBySel("user-list-search-input").type(ctx.userB.firstName);

cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();



// Enter payment details

const paymentAmount = 50;

const paymentNote = "Payment from A to B";

cy.getBySel("amount-input").type(paymentAmount.toString());

cy.getBySel("transaction-create-description-input").type(paymentNote);



// Submit payment

cy.getBySel("transaction-create-submit-payment").click();



// Wait for transaction creation

cy.wait("@createTransaction");



// Log out as User A

cy.getBySel("sidenav-signout").click();



// Login as User B to check notification

cy.loginByXstate(ctx.userB.username);



// Wait for notifications to load

cy.wait("@getNotifications");



// Verify notification badge is visible

cy.getBySel("nav-top-notifications-count").should("be.visible");



// Open notifications

cy.getBySel("sidenav-notifications").click();



// Verify the notification content

cy.getBySel("notification-list-item")

.first()

.should("contain", ctx.userA.firstName)

.and("contain", "paid");


 });
    });
});
