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
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
// Step 1: Find an existing transaction between User A and User B or create a new one

  cy.database("find", "transactions", {
    senderId: ctx.userA.id,
    receiverId: ctx.userB.id
  }).then((transaction: Transaction) => {
    if (transaction) {
      // Use existing transaction

      performLikeAndCheckNotifications(transaction.id);
    } else {
      // Create a new transaction between User A and User B

      cy.loginByXstate(ctx.userA.username);

      // Navigate to new transaction form

      cy.getBySel("nav-top-new-transaction").click();

      // Select User B as recipient

      cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
      cy.getBySel("user-list-item").first().click();

      // Enter transaction details

      cy.getBySel("amount-input").type("50");
      cy.getBySel("transaction-create-description-input").type("Test transaction for like notification");
      cy.getBySel("transaction-create-submit-payment").click();

      // Wait for transaction creation to complete

      cy.wait("@createTransaction").then(intercept => {
        // Extract transaction ID from the response

        const transactionId = intercept.response.body.transaction.id;

        // Log out User A

        cy.getBySel("sidenav-signout").click();

        // Continue with the test using the new transaction

        performLikeAndCheckNotifications(transactionId);
      });
    }
  });

  // Function to perform like and check notifications for both users

  function performLikeAndCheckNotifications(transactionId: string) {
    // Log in as User C

    cy.loginByXstate(ctx.userC.username);

    // Navigate to the transaction

    cy.visit(`/transaction/${transactionId}`);

    // User C likes the transaction

    cy.getBySel("like-button").click();
    cy.wait("@postLike");

    // Log out as User C

    cy.getBySel("sidenav-signout").click();

    // Log in as User A and check for notification

    cy.loginByXstate(ctx.userA.username);
    cy.wait("@getNotifications");

    // Verify notification count badge shows correctly

    cy.getBySel("nav-top-notifications-count").should("exist");

    // Open notifications panel

    cy.getBySel("nav-top-notifications-link").click();

    // Verify User A received notification that User C liked their transaction

    cy.getBySel("notification-list-item").first().should("contain", ctx.userC.firstName).and("contain", "liked");

    // Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Log in as User B and check for notification

    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");

    // Verify notification count badge shows correctly

    cy.getBySel("nav-top-notifications-count").should("exist");

    // Open notifications panel

    cy.getBySel("nav-top-notifications-link").click();

    // Verify User B received notification that User C liked their transaction

    cy.getBySel("notification-list-item").first().should("contain", ctx.userC.firstName).and("contain", "liked");
  }
 });
    });
});
