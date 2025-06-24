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
        it('User A sends a payment to User B', () => {
    // Step 1: Log in as User A

      cy.loginByXstate(ctx.userA.username);

      // Step 2: Start a new transaction

      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");

      // Step 3: Search and select User B as the recipient

      cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
      cy.getBySelLike("user-list-item").contains(ctx.userB.firstName).click();

      // Step 4: Enter payment details

      cy.getBySel("amount-input").type("25");
      cy.getBySel("transaction-create-description-input").type("Test payment from User A to User B");

      // Step 5: Submit the payment

      cy.getBySel("transaction-create-submit-payment").click();
      cy.wait("@createTransaction");

      // Step 6: Assert that the transaction was successful

      cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Transaction Submitted!");

      // Step 7: Log out User A

      cy.logoutByXstate();

      // Step 8: Log in as User B to check for notification

      cy.loginByXstate(ctx.userB.username);

      // Step 9: Open notifications

      if (isMobile()) {
        cy.getBySel("sidenav-toggle").click();
      }
      cy.getBySel("nav-top-notifications-link").click();
      cy.wait("@getNotifications");

      // Step 10: Assert that User B received a notification about the payment from User A

      cy.getBySelLike("notification-list-item").should("contain", ctx.userA.firstName).and("contain", "paid you").and("contain", "25");
  });
    });
});
