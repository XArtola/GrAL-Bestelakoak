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

cy.getBySel("new-transaction").click();



// Select User B from the list

cy.getBySelLike("user-list-item").contains(ctx.userB.firstName).click();



// Enter payment details

const paymentAmount = "50";

const paymentNote = "Payment for lunch";

cy.getBySel("amount-input").type(paymentAmount);

cy.getBySel("transaction-create-description-input").type(paymentNote);



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



// Verify the notification content

cy.getBySel("notification-list-item")

.first()

.should("be.visible")

.and("contain", ctx.userA.firstName)

.and("contain", "paid you")

.and("contain", `$${paymentAmount}.00`);
 });
    });
});
