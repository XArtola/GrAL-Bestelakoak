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
// Login as User A

  cy.loginByXstate(ctx.userA.username);

  // Create a transaction between User A and User B

  cy.visit("/transaction/new");
  cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
  cy.getBySel("amount-input").type("50");
  cy.getBySel("transaction-create-description-input").type("Test transaction for like notification");
  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Get the transaction ID from the URL

  let transactionId: string;
  cy.url().then(url => {
    transactionId = url.split("/").pop()!;

    // Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Log in as User C

    cy.loginByXstate(ctx.userC.username);

    // Visit the transaction between User A and User B

    cy.visit(`/transaction/${transactionId}`);

    // Like the transaction

    cy.getBySel("like-button").click();
    cy.wait("@postLike");

    // Log out as User C

    cy.getBySel("sidenav-signout").click();

    // Check User A's notifications

    cy.loginByXstate(ctx.userA.username);
    cy.visit("/notifications");
    cy.wait("@getNotifications");

    // Verify User A received a notification about User C's like

    cy.getBySel("notification-list-item").first().should("contain", ctx.userC.firstName).and("contain", "liked your transaction");

    // Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Check User B's notifications

    cy.loginByXstate(ctx.userB.username);
    cy.visit("/notifications");
    cy.wait("@getNotifications");

    // Verify User B received a notification about User C's like

    cy.getBySel("notification-list-item").first().should("contain", ctx.userC.firstName).and("contain", "liked");
  });
 });
    });
});
