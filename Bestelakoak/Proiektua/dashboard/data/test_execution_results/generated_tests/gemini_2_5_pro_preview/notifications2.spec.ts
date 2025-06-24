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
// <generated_code>

  // Log in as User A and create a transaction with User B

  cy.loginByXstate(ctx.userA.username);
  cy.getBySel("nav-top-new-transaction").click();
  cy.getBySel("user-list-search-input").type(ctx.userB.firstName);
  cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
  cy.getBySel("amount-input").type("15");
  cy.getBySel("transaction-create-description-input").type("Test transaction for like");
  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");
  let transactionId: string;
  cy.url().then(url => {
    transactionId = url.split("/").pop()!;

    // Log out User A

    cy.getBySel("sidenav-signout").click();

    // Log in as User C

    cy.loginByXstate(ctx.userC.username);
    cy.wait("@getNotifications"); // Wait for initial notifications to load

    // Visit the transaction and like it

    cy.visit(`/transaction/${transactionId}`);
    cy.getBySelLike("like-button").click();
    cy.wait("@postLike");

    // Log out User C

    cy.getBySel("sidenav-signout").click();

    // Log in as User A and check notifications

    cy.loginByXstate(ctx.userA.username);
    cy.visit("/");
    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-count").should("contain", "1");
    cy.getBySel("nav-top-notifications-link").click();
    cy.getBySelLike("notification-list-item").first().should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);

    // Log out User A

    cy.getBySel("sidenav-signout").click();

    // Log in as User B and check notifications

    cy.loginByXstate(ctx.userB.username);
    cy.visit("/");
    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-count").should("contain", "1");
    cy.getBySel("nav-top-notifications-link").click();
    cy.getBySelLike("notification-list-item").first().should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
  });

  // </generated_code>
 });
    });
});
