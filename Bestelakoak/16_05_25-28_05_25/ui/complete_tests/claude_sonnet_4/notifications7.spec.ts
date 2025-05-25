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
```typescript
// renders an empty notifications state
it("renders an empty notifications state", () => {
// Create a fresh user with no interactions/notifications
cy.task("db:seed:user").then((user: User) => {
// Login as the new user
cy.loginByXstate(user.username);
cy.wait("@getNotifications");

// Navigate to notifications page
if (isMobile()) {
cy.getBySel("sidenav-toggle").click();
}
cy.getBySel("sidenav-notifications").click();

// Verify empty notifications state is displayed
cy.getBySel("empty-list-header").should("be.visible");
cy.getBySel("empty-list-sub-header").should("be.visible");

// Verify no notification items are present
cy.getBySel("notification-list-item").should("not.exist");
});
});
```
 });
});
