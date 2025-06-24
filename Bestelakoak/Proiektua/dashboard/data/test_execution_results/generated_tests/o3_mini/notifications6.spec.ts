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

      // Step 2: Navigate to the new transaction form

      cy.get('[data-test="new-transaction"]').click();

      // Step 3: Fill in the payment request details

      // Using User C's username as the recipient identifier

      cy.get('[data-test="transaction-recipient"]').type(ctx.userC.username);

      // Set a payment amount (for example, $100.00)

      const paymentAmount = "100.00";
      cy.get('[data-test="transaction-amount"]').type(paymentAmount);

      // Provide a description that identifies the transaction as a payment request

      cy.get('[data-test="transaction-description"]').type(`Payment request from ${ctx.userA.username} to ${ctx.userC.username}`);

      // Step 4: Select the "payment request" option if applicable (assuming a radio button exists)

      cy.get('[data-test="transaction-type-request"]').click();

      // Step 5: Submit the transaction form

      cy.get('[data-test="transaction-submit"]').click();

      // Step 6: Wait for the POST /transactions call and assert success

      cy.wait('@createTransaction').then(interception => {
        expect(interception.response.statusCode).to.eq(200);

        // Assert that the transaction has an id property

        expect(interception.response.body).to.have.property('id');
      });

      // Step 7: Verify that a notification is created for User C regarding the payment request

      // (Assuming a helper command "cy.database" returns the current notifications)

      cy.database('filter', 'notifications').then(notifications => {
        const notificationForUserC = notifications.find(n => n.userId === ctx.userC.id && n.transactionId);
        expect(notificationForUserC).to.exist;
      });
  });
    });
});
