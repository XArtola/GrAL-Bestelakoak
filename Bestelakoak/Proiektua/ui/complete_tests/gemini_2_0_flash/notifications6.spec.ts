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
    // Log in as User A

      cy.loginByXstate(ctx.userA.username);

      // Navigate to the new transaction page

      cy.getBySelLike("new-transaction").click();

      // Search for User C

      cy.getBySelLike("user-list-search-input").type(ctx.userC.username);
      cy.wait(500); // Wait for the search results to load

      // Select User C from the search results

      cy.getBySelLike("user-list-item").contains(ctx.userC.username).click();

      // Enter the payment amount

      const amount = "5.00";
      cy.get("#amount").type(amount);

      // Add a description

      const description = `Payment request from ${ctx.userA.username} to ${ctx.userC.username}`;
      cy.getBySelLike("transaction-create-description-input").type(description);

      // Request money

      cy.getBySelLike("request-money").click();

      // Verify the transaction is created and a notification is sent to User C

      cy.wait("@createTransaction").then(interception => {
        expect(interception.response?.statusCode).to.eq(200);
      });

      //Log out User A

      cy.logoutByXstate();

      //Login as User C

      cy.loginByXstate(ctx.userC.username);

      //Go to notifications

      cy.getBySelLike("nav-notifications-tab").click();

      //Verify that User C has a notification for the payment request

      cy.wait("@getNotifications").then(() => {
        cy.getBySelLike("list-item-single-notification").should("contain", ctx.userA.username).should("contain", "requested");
      });
  });
    });
});
