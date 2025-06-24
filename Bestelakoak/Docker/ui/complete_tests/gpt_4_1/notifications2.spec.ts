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
        it('User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction', () => {
    // User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction

    // 1. User A logs in and sends a payment to User B
    cy.loginByXstate(ctx.userA.username);
    cy.getBySelLike("new-transaction").click();
    cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
    cy.getBySelLike("user-list-item").contains(ctx.userB.firstName).click();
    cy.getBySel("amount-input").type("10");
    cy.getBySel("transaction-create-submit-payment").click();
    cy.wait("@createTransaction").its("response.statusCode").should("eq", 201);

    // 2. Get the transaction ID of the new transaction between User A and User B
    cy.wait("@personalTransactions");
    cy.getBySel("transaction-item").first().invoke("attr", "data-test").then((transactionTestAttr) => {
      const transactionId = transactionTestAttr?.replace("transaction-item-", "");
      expect(transactionId).to.exist;

      // 3. User C logs in and likes the transaction
      cy.switchUserByXstate(ctx.userC.username);
      cy.getBySel("nav-personal-tab").click();
      cy.getBySel(`transaction-item-${transactionId}`).click();
      cy.getBySel("like-button").click();

      // 4. User A logs in and checks for notification
      cy.switchUserByXstate(ctx.userA.username);
      cy.getBySel("nav-notifications-tab").click();
      cy.wait("@getNotifications");
      cy.getBySel("notification-list").should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);

      // 5. User B logs in and checks for notification
      cy.switchUserByXstate(ctx.userB.username);
      cy.getBySel("nav-notifications-tab").click();
      cy.wait("@getNotifications");
      cy.getBySel("notification-list").should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
    });
  });
    });
});
