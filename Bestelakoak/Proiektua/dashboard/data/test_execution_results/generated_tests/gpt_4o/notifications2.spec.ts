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
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
// Step 1: Find a transaction between User A and User B

  cy.database("find", "transactions", {
    senderId: ctx.userA.id,
    receiverId: ctx.userB.id
  }).then((transaction: Transaction) => {
    // Step 2: Log in as User C

    cy.loginByXstate(ctx.userC.username);

    // Step 3: Visit the transaction detail page

    cy.visit(`/transaction/${transaction.id}`);

    // Step 4: Like the transaction

    cy.getBySelLike("like-button").click();
    cy.wait("@postLike");

    // Step 5: Log out as User C

    cy.getBySel("sidenav-signout").click();

    // Step 6: Log in as User A and verify notification

    cy.loginByXstate(ctx.userA.username);
    cy.visit("/");
    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-count").should("contain", "1");
    cy.getBySel("nav-top-notifications-link").click();
    cy.getBySelLike("notification-list-item").first().should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);

    // Step 7: Log out as User A

    cy.getBySel("sidenav-signout").click();

    // Step 8: Log in as User B and verify notification

    cy.loginByXstate(ctx.userB.username);
    cy.visit("/");
    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-count").should("contain", "1");
    cy.getBySel("nav-top-notifications-link").click();
    cy.getBySelLike("notification-list-item").first().should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
  });
 });
    });
});
