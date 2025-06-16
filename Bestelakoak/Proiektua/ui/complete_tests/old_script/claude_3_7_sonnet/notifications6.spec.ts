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
// Login as User A

cy.loginByXstate(ctx.userA.username);



// Create a payment request to User C

cy.getBySel("new-transaction").click();

cy.getBySel("user-list-search-input").type(ctx.userC.firstName);

cy.getBySel("user-list-item").first().click();



// Enter payment request details

cy.getBySel("amount-input").type("75");

cy.getBySel("transaction-create-description-input").type("Test payment request");

cy.getBySel("transaction-create-submit-request").click();



// Wait for transaction creation

cy.wait("@createTransaction");



// Log out User A

cy.getBySel("sidenav-signout").click();



// Login as User C to verify notification

cy.loginByXstate(ctx.userC.username);



// Navigate to notifications

cy.getBySel("sidenav-notifications").click();

cy.wait("@getNotifications");



// Verify notification content

cy.getBySel("notification-list-item")

.first()

.should("contain", ctx.userA.firstName)

.and("contain", "requested");


 });
    });
});
