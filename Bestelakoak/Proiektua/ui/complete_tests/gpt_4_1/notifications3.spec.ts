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
        it('User A comments on a transaction of User B; User B gets notification that User A commented on their transaction', () => {
    // User A comments on a transaction of User B; User B gets notification that User A commented on their transaction

    // 1. User A logs in
    cy.loginByXstate(ctx.userA.username);

    // 2. User A navigates to User B's profile or finds a transaction where User B is the receiver
    cy.database("filter", "transactions", { receiverId: ctx.userB.id }).then((transactions: Transaction[]) => {
      const transaction = transactions[0];
      expect(transaction).to.exist;

      // 3. User A comments on the transaction
      cy.visit(`/transaction/${transaction.id}`);
      cy.getBySel("transaction-comment-input").type("Nice transaction, User B!");
      cy.getBySel("transaction-comment-submit").click();
      cy.wait("@postComment");

      // 4. User A logs out
      cy.logoutByXstate();

      // 5. User B logs in
      cy.loginByXstate(ctx.userB.username);

      // 6. User B checks notifications
      cy.visit("/notifications");
      cy.wait("@getNotifications");

      // 7. Assert that User B received a notification about User A's comment
      cy.getBySel("notification-list")
        .contains(`${ctx.userA.firstName} ${ctx.userA.lastName}`)
        .should("exist")
        .and("contain", "commented on your transaction");
    });
  });
    });
});
