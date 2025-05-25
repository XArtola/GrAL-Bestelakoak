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
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => {
// Find or create a transaction from User B

cy.database("find", "transactions", { senderId: ctx.userB.id })

.then((transaction: Transaction) => {

// Login as User A

cy.loginByXstate(ctx.userA.username);

cy.wait("@getNotifications");



// Visit the transaction and like it

cy.visit(`/transaction/${transaction.id}`);

cy.getBySel("like-button").click();

cy.wait("@postLike");



// Verify the like was registered

cy.getBySel("like-count").should("contain", "1");



// Logout User A

cy.getBySel("sidenav-signout").click();



// Login as User B

cy.loginByXstate(ctx.userB.username);

cy.wait("@getNotifications");



// Check notifications

cy.getBySel("nav-top-notifications-count").should("contain", "1");

cy.getBySel("nav-top-notifications-link").click();



// Verify notification content

cy.getBySel("notification-list-item")

.first()

.should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName}`)

.and("contain", "liked");

});


 });
    });
});
