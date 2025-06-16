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
// Login as User B first to create a transaction

  cy.loginByXstate(ctx.userB.username);
  cy.wait("@getNotifications");

  // Create a new transaction as User B (sending to User A)

  cy.getBySel("new-transaction").click();
  cy.getBySel("user-list-item").contains(ctx.userA.firstName).click();
  cy.getBySel("amount-input").type("50");
  cy.getBySel("transaction-create-description-input").type("Test transaction for notification");
  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Get the transaction ID from the URL

  let transactionId: string;
  cy.url().then(url => {
    transactionId = url.split("/").pop()!;

    // Log out as User B

    cy.getBySel("sidenav-signout").click();

    // Login as User A

    cy.loginByXstate(ctx.userA.username);
    cy.wait("@getNotifications");

    // Visit the transaction that User B created

    cy.visit(`/transaction/${transactionId}`);

    // Like the transaction

    cy.getBySel("like-button").click();

    // Verify the like count is updated

    cy.getBySel("like-count").should("contain", "1");

    // Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Login as User B again to check notifications

    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");

    // Navigate to notifications page

    cy.getBySel("sidenav-notifications").click();

    // Verify the notification about the like exists

    cy.getBySel("notification-list-item").first().should("contain", ctx.userA.firstName).and("contain", "liked");
  });
 });
    });
});
