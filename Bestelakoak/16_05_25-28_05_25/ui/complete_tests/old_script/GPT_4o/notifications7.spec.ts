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
// Seed the database with no interactions

cy.task("db:seed");



// Log in as User A

cy.loginByXstate(ctx.userA.username);



// Navigate to the notifications page

cy.getBySel("nav-notifications").click();



// Assert that the notifications list is empty

cy.getBySelLike("notification-item").should("have.length", 0);



// Verify the empty state message is displayed

cy.contains("No notifications").should("exist");
 });
});
