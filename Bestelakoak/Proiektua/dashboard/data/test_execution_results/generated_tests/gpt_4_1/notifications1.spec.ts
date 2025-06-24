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
        it('User A likes a transaction of User B; User B gets notification that User A liked transaction ', () => {
    // User A likes a transaction of User B; User B gets notification that User A liked transaction
    // 1. User A logs in and sends a payment to User B
    cy.loginByXstate(ctx.userA.username);
    cy.getBySel("nav-public-tab").click();
    cy.wait("@getNotifications");

    // 2. User A creates a payment transaction to User B
    cy.getBySel("nav-new-transaction").click();
    cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
    cy.getBySelLike("user-list-item").contains(ctx.userB.firstName).click();
    cy.getBySel("amount-input").type("10");
    cy.getBySel("transaction-create-description-input").type("Test payment");
    cy.getBySel("transaction-create-submit-payment").click();
    cy.wait("@createTransaction");

    // 3. User A logs out, User B logs in
    cy.logoutByXstate();
    cy.loginByXstate(ctx.userB.username);
    cy.wait("@getNotifications");

    // 4. User B goes to personal transactions and finds the transaction from User A
    cy.getBySel("nav-personal-tab").click();
    cy.getBySelLike("transaction-item").contains("Test payment").first().click();

    // 5. User B likes the transaction
    cy.getBySel("like-button").click();

    // 6. User B logs out, User A logs in
    cy.logoutByXstate();
    cy.loginByXstate(ctx.userA.username);
    cy.wait("@getNotifications");

    // 7. User A checks notifications for a like from User B
    cy.getBySel("nav-notifications-tab").click();
    cy.wait("@getNotifications");
    cy.getBySelLike("notification-list-item")
      .should("contain", ctx.userB.firstName)
      .and("contain", "liked your transaction");
  });
    });
});
