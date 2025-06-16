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
// Step 1: Log in as User A

  cy.loginByXstate(ctx.userA.username);

  // Step 2: Navigate to a transaction of User B

  cy.database("find", "transactions", {
    senderId: ctx.userB.id
  }).then(transaction => {
    cy.visit(`/transaction/${transaction.id}`);

    // Step 3: Like the transaction

    cy.getBySel("like-button").click();

    // Step 4: Log out User A

    cy.getBySel("sidenav-signout").click();

    // Step 5: Log in as User B

    cy.loginByXstate(ctx.userB.username);

    // Step 6: Check for notifications

    cy.getBySel("sidenav-notifications").click();
    cy.wait("@getNotifications");

    // Step 7: Verify the notification about the like exists

    cy.getBySel("notification-list-item").first().should("contain", ctx.userA.firstName).and("contain", "liked");
  });
 });
    });
});
