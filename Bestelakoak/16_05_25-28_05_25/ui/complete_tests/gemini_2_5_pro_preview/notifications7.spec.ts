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
    it("renders an empty notifications state", () => {
// Create a brand new user that won't have notifications to ensure an empty state
cy.task("db:seed:user").then((newUser: User) => {
// Log in as the newly created user
cy.loginByXstate(newUser.username);
cy.wait("@getNotifications"); // Wait for any initial notification fetch

// Navigate to the notifications page
if (isMobile()) {
cy.getBySel("sidenav-toggle").click(); // Toggle sidenav if on mobile
}
cy.getBySel("notifications-link").click(); // Click on the notifications link

// It's possible notifications are fetched again upon navigation
cy.wait("@getNotifications");

// Verify that the empty state message is displayed
cy.getBySel("empty-list-header").should("be.visible");
cy.getBySel("empty-list-sub-header").should("be.visible");

// Additionally, verify that no notification items are present in the list
cy.getBySel("notification-list-item").should("not.exist");
});
 });
});
