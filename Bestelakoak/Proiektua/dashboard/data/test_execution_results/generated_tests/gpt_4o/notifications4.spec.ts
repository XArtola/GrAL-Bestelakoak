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
// Step 1: Find a transaction between User A and User B

  cy.database("find", "transactions", {
    senderId: ctx.userA.id,
    receiverId: ctx.userB.id
  }).then((transaction: Transaction) => {
    // Step 2: Login as User C

    cy.loginByXstate(ctx.userC.username);

    // Step 3: Navigate to the transaction

    cy.visit(`/transaction/${transaction.id}`);

    // Step 4: Comment on the transaction

    const commentText = "This is a test comment from User C";
    cy.getBySel("comment-input").type(commentText);
    cy.getBySel("comment-submit").click();
    cy.wait("@postComment");

    // Step 5: Logout User C

    cy.getBySel("sidenav-signout").click();

    // Step 6: Login as User A and check for notification

    cy.loginByXstate(ctx.userA.username);
    cy.wait("@getNotifications");
    cy.getBySel("notifications-link").click();
    cy.getBySel("notification-list-item").should("contain", ctx.userC.firstName).and("contain", "commented");

    // Step 7: Logout User A

    cy.getBySel("sidenav-signout").click();

    // Step 8: Login as User B and check for notification

    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");
    cy.getBySel("notifications-link").click();
    cy.getBySel("notification-list-item").should("contain", ctx.userC.firstName).and("contain", "commented");
  });
 });
    });
});
