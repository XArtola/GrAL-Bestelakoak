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
        it("User A sends a payment to User B", () => {
// Log in as User A
cy.loginByXstate(ctx.userA.username);

// Create a new payment to User B
cy.getBySel("nav-top-new-transaction").click();
// search and select User B
cy.getBySel("user-list-search-input").type(ctx.userB.username);
cy.getBySelLike("user-list-item").contains(ctx.userB.username).click();
// enter amount and description
cy.getBySel("amount-input").type("50");
cy.getBySel("transaction-create-description-input").type("Test payment from A to B");
// submit payment
cy.getBySel("transaction-create-submit-payment").click();
cy.wait("@createTransaction");

// Log out User A
cy.getBySel("sidenav-signout").click();

// Log in as User B and verify notification
cy.loginByXstate(ctx.userB.username);
// wait for notifications to load
cy.wait("@getNotifications");
// badge shows 1 new notification
cy.getBySel("nav-top-notifications-count").should("contain", "1");
// open notifications list
cy.getBySel("nav-top-notifications-link").click();
// first item mentions User A paid you
cy.getBySelLike("notification-list-item")
.first()
.should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName}`)
.and("contain", "paid you");
 });
    });
});
