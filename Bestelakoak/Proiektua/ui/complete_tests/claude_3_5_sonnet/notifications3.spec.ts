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
// Find or create a transaction from User B

  cy.loginByXstate(ctx.userB.username);
  cy.visit("/transaction/new");
  cy.getBySel("user-list-item").contains(ctx.userA.firstName).click();
  cy.getBySel("amount-input").type("50");
  cy.getBySel("transaction-create-description-input").type("Test transaction");
  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Get transaction ID from URL

  let transactionId: string;
  cy.url().then(url => {
    transactionId = url.split("/").pop()!;

    // Log out as User B

    cy.getBySel("sidenav-signout").click();

    // Log in as User A and add a comment

    cy.loginByXstate(ctx.userA.username);
    cy.visit(`/transaction/${transactionId}`);
    const commentText = "Test comment from User A";
    cy.getBySel("comment-input").type(commentText);
    cy.getBySel("comment-submit").click();
    cy.wait("@postComment");

    // Verify comment appears

    cy.getBySel("comments-list").should("contain", commentText).and("contain", ctx.userA.firstName);

    // Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Log back in as User B to check notification

    cy.loginByXstate(ctx.userB.username);
    cy.visit("/notifications");
    cy.wait("@getNotifications");

    // Verify notification exists

    cy.getBySel("notification-list-item").first().should("contain", ctx.userA.firstName).and("contain", "commented on your transaction");
  });
 });
    });
});
