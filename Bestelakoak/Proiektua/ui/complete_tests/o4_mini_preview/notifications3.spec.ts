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
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
// Create a transaction authored by User B
  cy.database("create", "transaction", {
    senderId: ctx.userB.id,
    receiverId: ctx.userA.id,
    amount: 5000,
    description: "Transaction by User B"
  }).then((tx: Transaction) => {
    // Log in as User A to comment
    cy.loginByXstate(ctx.userA.username);
    cy.visit(`/transaction/${tx.id}`);
    
    // Post a comment on the transaction
    const commentText = "Looks good!";
    cy.getBySel("comment-input").type(`${commentText}{enter}`);
    cy.wait("@postComment");
    
    // Log out User A
    cy.getBySel("sidenav-signout").click();
    
    // Log in as User B and verify notification
    cy.loginByXstate(ctx.userB.username);
    cy.visit("/notifications");
    cy.wait("@getNotifications");
    cy.contains(`${ctx.userA.firstName} commented on your transaction`).should("be.visible");
  });
 });
    });
});
