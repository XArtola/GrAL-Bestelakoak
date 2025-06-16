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
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
// Step 1: Login as User B and create a transaction or find an existing one

  cy.loginByXstate(ctx.userB.username);

  // Step 2: Create a new transaction as User B to User A so we have a transaction to comment on

  cy.getBySel("nav-top-new-transaction").click();
  cy.getBySel("user-list-search-input").type(ctx.userA.firstName);
  cy.getBySel("user-list-item").contains(ctx.userA.firstName).click();
  cy.getBySel("amount-input").type("25");
  cy.getBySel("transaction-create-description-input").type("Test transaction for comments");
  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Step 3: Get the transaction ID from the URL

  cy.url().then(url => {
    const transactionId = url.split("/").pop();

    // Step 4: Logout User B

    cy.getBySel("sidenav-signout").click();

    // Step 5: Login as User A

    cy.loginByXstate(ctx.userA.username);

    // Step 6: Navigate to the transaction created by User B

    cy.visit(`/transaction/${transactionId}`);

    // Step 7: Add a comment to the transaction

    const commentText = "Great transaction!";
    cy.getBySel("comment-input").type(commentText);
    cy.getBySel("comment-submit").click();
    cy.wait("@postComment");

    // Step 8: Verify the comment appears

    cy.getBySel("comments-list").should("contain", commentText);

    // Step 9: Logout User A

    cy.getBySel("sidenav-signout").click();

    // Step 10: Login as User B to check notifications

    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");

    // Step 11: Navigate to notifications and verify User B received notification about User A's comment

    cy.getBySel("sidenav-notifications").click();

    // Step 12: Verify the notification exists and contains User A's information

    cy.getBySel("notification-list-item").first().should("contain", ctx.userA.firstName).and("contain", "commented");
  });
 });
    });
});
