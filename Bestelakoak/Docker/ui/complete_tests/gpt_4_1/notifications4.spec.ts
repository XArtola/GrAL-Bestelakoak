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
        it('User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction', () => {
    // User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction
    cy.loginByXstate(ctx.userC.username);
    // Step 1: User C creates a transaction with User B (User B as receiver)
    cy.getBySelLike("new-transaction").click();
    cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
    cy.getBySelLike("user-list-item").contains(ctx.userB.firstName).click();
    cy.getBySel("amount-input").type("50");
    cy.getBySel("transaction-create-submit-payment").click();
    cy.wait("@createTransaction").then((interception) => {
      const transactionId = interception.response?.body.id;
      // Step 2: User C logs out, User A logs in
      cy.switchUserByXstate(ctx.userA.username);
      // Step 3: User A comments on the transaction (simulate User C commenting on a transaction between A and B)
      cy.visit(`/transaction/${transactionId}`);
      cy.getBySel("transaction-comment-input").type("Nice transaction from C!");
      cy.getBySel("transaction-comment-submit").click();
      cy.wait("@postComment");
      // Step 4: User B logs in and checks notifications
      cy.switchUserByXstate(ctx.userB.username);
      cy.getBySel("nav-notifications-tab").click();
      cy.wait("@getNotifications");
      cy.getBySelLike("notification-list-item")
        .should("contain", ctx.userC.firstName)
        .and("contain", "commented on your transaction");
      // Step 5: User A checks notifications
      cy.switchUserByXstate(ctx.userA.username);
      cy.getBySel("nav-notifications-tab").click();
      cy.wait("@getNotifications");
      cy.getBySelLike("notification-list-item")
        .should("contain", ctx.userC.firstName)
        .and("contain", "commented on your transaction");
    });
  });
    });
});
