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
    // renders an empty notifications state
    // This test verifies that when a user with no notifications logs in, the empty state is shown.

    cy.loginByXstate(ctx.userA.username);
    // Navigate to notifications page
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("nav-notifications-tab").click();
    cy.wait("@getNotifications");

    // Assert that the empty notifications state is rendered
    cy.getBySel("empty-notifications-header").should("be.visible");
    cy.getBySel("empty-notifications-message").should("contain", "You have no notifications");
  });
});
