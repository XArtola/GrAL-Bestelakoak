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
    // "User A sends a payment to User B"

    // Step 1: Log in as User A
    cy.loginByXstate(ctx.userA.username);

    // Step 2: Navigate to the new transaction form (assumed route)
    cy.visit("/new-transaction");

    // Step 3: Fill out the payment form
    // Assuming there are form fields with data-test attributes for recipient and amount
    cy.get('[data-test="recipient-input"]').type(ctx.userB.username); // using User B's username as recipient
    cy.get('[data-test="amount-input"]').type("100"); // example amount – adjust as needed

    // Submit the payment
    cy.get('[data-test="send-payment"]').click();

    // Step 4: Wait for the payment transaction to be created successfully
    cy.wait("@createTransaction").its("response.statusCode").should("eq", 200);

    // Step 5: Log out as User A (assuming a logout command exists)
    cy.logout();

    // Step 6: Log in as User B to verify that the notification has been received
    cy.loginByXstate(ctx.userB.username);

    // Step 7: Navigate to the notifications page
    cy.visit("/notifications");

    // Step 8: Assert that a notification reflecting the payment from User A exists
    cy.get('[data-test="notification"]')
      .should("contain", "payment")
      .and("contain", ctx.userA.username);
  });
    });
});
