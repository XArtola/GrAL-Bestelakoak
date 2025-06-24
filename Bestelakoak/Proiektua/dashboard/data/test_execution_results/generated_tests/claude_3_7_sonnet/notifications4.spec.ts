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
// Login as User A

  cy.loginByXstate(ctx.userA.username);

  // Create a transaction between User A and User B

  cy.visit("/transaction/new");
  cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
  cy.getBySel("amount-input").type("50");
  cy.getBySel("transaction-create-description-input").type("Test transaction AB");
  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Get transaction ID from URL

  let transactionId: string;
  cy.url().then(url => {
    transactionId = url.split("/").pop()!;

    // Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Login as User C

    cy.loginByXstate(ctx.userC.username);

    // Visit the transaction

    cy.visit(`/transaction/${transactionId}`);

    // Add a comment

    const comment = "This is a comment from User C!";
    cy.getBySel("comment-input").type(comment);
    cy.getBySel("comment-submit").click();
    cy.wait("@postComment");

    // Verify the comment appears

    cy.getBySel("comments-list").should("contain", comment);

    // Log out as User C

    cy.getBySel("sidenav-signout").click();

    // Login as User A and check for notification

    cy.loginByXstate(ctx.userA.username);
    cy.getBySel("nav-top-notifications-count").should("exist");
    cy.getBySel("nav-top-notifications-link").click();
    cy.wait("@getNotifications");

    // Verify notification about User C's comment

    cy.getBySel("notification-list-item").first().should("contain", ctx.userC.firstName).and("contain", "commented");

    // Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Login as User B and check for notification

    cy.loginByXstate(ctx.userB.username);
    cy.getBySel("nav-top-notifications-count").should("exist");
    cy.getBySel("nav-top-notifications-link").click();
    cy.wait("@getNotifications");

    // Verify notification about User C's comment

    cy.getBySel("notification-list-item").first().should("contain", ctx.userC.firstName).and("contain", "commented");
  });
 });
    });
});
