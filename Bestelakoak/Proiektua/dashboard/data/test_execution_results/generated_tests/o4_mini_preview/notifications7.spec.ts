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
// It should render an empty notifications state
// Log in as the seeded user (ctx.userA) and wait for the notifications API
cy.loginByXstate(ctx.userA.username);
cy.wait("@getNotifications");

// Open the notifications panel
cy.getBySel("notifications-link").click();

// Assert that the empty‐state UI is shown
cy.getBySel("empty-list-header").should("be.visible");
cy.getBySel("empty-list-sub-header").should("be.visible");
 });
});
