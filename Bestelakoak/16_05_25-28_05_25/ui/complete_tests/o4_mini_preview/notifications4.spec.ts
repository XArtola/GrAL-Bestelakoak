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
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
// Find an existing transaction between User A and User B
cy.database("find", "transactions", {
senderId: ctx.userA.id,
receiverId: ctx.userB.id
}).then((transaction: Transaction) => {
const commentText = "Great transaction!";

// Login as User C and post a comment
cy.loginByXstate(ctx.userC.username);
cy.visit(`/transaction/${transaction.id}`);
cy.getBySel("comment-input").type(`${commentText}{enter}`);
cy.wait("@postComment");
// Logout User C
cy.getBySel("sidenav-signout").click();

// Switch to User A and verify notification
cy.switchUser(ctx.userA.username);
cy.visit("/");
cy.wait("@getNotifications");
cy.getBySel("nav-top-notifications-link").click();
cy.getBySelLike("notification-list-item")
.first()
.should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
cy.getBySel("sidenav-signout").click();

// Switch to User B and verify notification
cy.switchUser(ctx.userB.username);
cy.visit("/");
cy.wait("@getNotifications");
cy.getBySel("nav-top-notifications-link").click();
cy.getBySelLike("notification-list-item")
.first()
.should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
});
 });
    });
});
