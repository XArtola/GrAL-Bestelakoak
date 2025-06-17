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
        it('User A sends a payment request to User C', () => {
    // Step 1: Log in as User A

      cy.loginByXstate(ctx.userA.username);

      // Step 2: Start a new transaction (request) to User C

      cy.getBySelLike("new-transaction").click();
      cy.getBySel("user-list-search-input").type(ctx.userC.firstName);
      cy.getBySelLike("user-list-item").contains(ctx.userC.firstName).click();

      // Step 3: Fill out the request form

      cy.getBySel("transaction-create-amount-input").type("50");
      cy.getBySel("transaction-create-description-input").type("Request from A to C");
      cy.getBySel("transaction-create-request-button").click();

      // Step 4: Wait for transaction to be created and notifications to be fetched

      cy.wait("@createTransaction");
      cy.wait("@getNotifications");

      // Step 5: Log out User A and log in as User C to check notification

      cy.logoutByXstate();
      cy.loginByXstate(ctx.userC.username);

      // Step 6: Open notifications and assert that a new request notification exists from User A

      cy.getBySel("nav-notifications-tab").click();
      cy.wait("@getNotifications");
      cy.getBySelLike("notification-list-item").should("contain", ctx.userA.firstName).and("contain", "requested").and("contain", "50");
  });
    });
});
