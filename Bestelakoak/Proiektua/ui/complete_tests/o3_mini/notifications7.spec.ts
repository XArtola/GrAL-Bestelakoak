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
    it('renders an empty notifications state', () => {
    // Test: renders an empty notifications state
    // Step 1: Visit the notifications view (adjust URL as needed)
    cy.visit("/notifications");

    // Step 2: Wait for the notifications API call to complete
    cy.wait("@getNotifications");

    // Step 3: Verify that the notifications container is present and empty
    // (Assuming the notifications list has a data-test attribute "notifications-list")
    cy.get('[data-test="notifications-list"]').should("exist").and("be.empty");

    // Alternatively, check for a 'no notifications' message
    cy.contains("No notifications").should("be.visible");
  });
});
