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
// Step 1: Login as User A and create a transaction with User B

  cy.loginByXstate(ctx.userA.username);

  // Navigate to create new transaction

  cy.getBySel("nav-top-new-transaction").click();

  // Select User B as recipient

  cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
  cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();

  // Fill transaction details

  cy.getBySel("amount-input").type("50");
  cy.getBySel("transaction-create-description-input").type("Test transaction for comments");

  // Submit payment

  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Get transaction ID from URL

  cy.url().then(url => {
    const transactionId = url.split("/").pop();

    // Step 2: Logout User A and login as User C

    cy.getBySel("sidenav-signout").click();
    cy.loginByXstate(ctx.userC.username);

    // Step 3: Navigate to the transaction and add a comment

    cy.visit(`/transaction/${transactionId}`);

    // Add comment

    const commentText = "Great transaction between you two!";
    cy.getBySel("comment-input").type(commentText);
    cy.getBySel("comment-submit").click();
    cy.wait("@postComment");

    // Verify comment appears

    cy.getBySel("comments-list").should("contain", commentText);

    // Step 4: Logout User C and check User A's notifications

    cy.getBySel("sidenav-signout").click();
    cy.loginByXstate(ctx.userA.username);

    // Navigate to notifications

    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-link").click();

    // Verify User A received notification about User C's comment

    cy.getBySel("notification-list-item").should("contain", ctx.userC.firstName).and("contain", "commented");

    // Step 5: Logout User A and check User B's notifications

    cy.getBySel("sidenav-signout").click();
    cy.loginByXstate(ctx.userB.username);

    // Navigate to notifications

    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-link").click();

    // Verify User B received notification about User C's comment

    cy.getBySel("notification-list-item").should("contain", ctx.userC.firstName).and("contain", "commented");
  });
 });
    });
});
