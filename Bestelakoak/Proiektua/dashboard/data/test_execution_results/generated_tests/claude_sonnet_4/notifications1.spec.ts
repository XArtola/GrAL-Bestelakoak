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
// Login as User B to create a transaction

  cy.loginByXstate(ctx.userB.username);

  // Create a new transaction from User B to another user

  cy.getBySel("new-transaction").click();
  cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();
  cy.getBySel("amount-input").type("25");
  cy.getBySel("transaction-create-description-input").type("Test transaction for like");
  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Get the transaction ID from the URL

  let transactionId: string;
  cy.url().then(url => {
    transactionId = url.split("/").pop()!;

    // Logout User B

    cy.getBySel("sidenav-signout").click();

    // Login as User A

    cy.loginByXstate(ctx.userA.username);

    // Navigate to the transaction and like it

    cy.visit(`/transaction/${transactionId}`);
    cy.getBySel("like-button").click();

    // Logout User A

    cy.getBySel("sidenav-signout").click();

    // Login as User B to check notifications

    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");

    // Navigate to notifications page

    cy.getBySel("sidenav-notifications").click();

    // Verify User B received a notification about User A's like

    cy.getBySel("notification-list-item").first().should("contain", ctx.userA.firstName).and("contain", "liked");
  });
 });
    });
});
