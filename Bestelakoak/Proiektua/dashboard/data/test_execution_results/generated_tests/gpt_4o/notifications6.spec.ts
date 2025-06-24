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
        it("User A sends a payment request to User C", () => {
// Log in as User A

  cy.loginByXstate(ctx.userA.username);

  // Navigate to the new transaction page

  cy.getBySel("new-transaction").click();

  // Search for User C in the user list and select them

  cy.getBySel("user-list-search-input").type(ctx.userC.firstName);
  cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();

  // Enter the payment request details

  cy.getBySel("amount-input").type("75");
  cy.getBySel("transaction-create-description-input").type("Concert tickets");

  // Submit the payment request

  cy.getBySel("transaction-create-submit-request").click();
  cy.wait("@createTransaction");

  // Log out as User A

  cy.getBySel("sidenav-signout").click();

  // Log in as User C

  cy.loginByXstate(ctx.userC.username);

  // Check for the notification

  cy.getBySel("sidenav-notifications").click();
  cy.getBySel("notification-list").should("contain", ctx.userA.firstName).and("contain", "requested");
 });
    });
});
