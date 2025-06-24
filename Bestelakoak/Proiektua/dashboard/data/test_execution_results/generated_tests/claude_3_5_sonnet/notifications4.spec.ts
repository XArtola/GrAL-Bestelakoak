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
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
// Test: User C comments on a transaction between User A and B; User A and B get notifications that User C commented on their transaction
// Login as User A
cy.loginByXstate(ctx.userA.username);
    
// Create a transaction between User A and User B
cy.visit("/transaction/new");
cy.getBySel("user-list-item").contains(ctx.userB.firstName).click();
cy.getBySelLike("amount").type("75");
cy.getBySelLike("description").type("Transaction between A and B");
cy.getBySel("transaction-create-submit-payment").click();
cy.wait("@createTransaction");

// Get the transaction id from the URL
let transactionId: string;
cy.url().then(url => {
    transactionId = url.split("/").pop()!;
    
    // Log out as User A
    cy.getBySel("sidenav-signout").click();
    
    // Log in as User C
    cy.loginByXstate(ctx.userC.username);
    
    // Visit the transaction detail page and add comment
    cy.visit(`/transaction/${transactionId}`);
    const commentText = "Test comment from User C";
    cy.getBySel("comment-input").type(`${commentText}{enter}`);
    cy.wait("@postComment");

    // Check User A's notifications
    cy.switchUser(ctx.userA.username);
    cy.visit("/");
    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-count").should("contain", "1");
    cy.getBySel("nav-top-notifications-link").click();
    cy.getBySelLike("notification-list-item")
        .first()
        .should("contain", ctx.userC.firstName)
        .and("contain", "commented");

    // Check User B's notifications
    cy.switchUser(ctx.userB.username);
    cy.visit("/");
    cy.wait("@getNotifications");
    cy.getBySel("nav-top-notifications-count").should("contain", "1");
    cy.getBySel("nav-top-notifications-link").click();
    cy.getBySelLike("notification-list-item")
        .first()
        .should("contain", ctx.userC.firstName)
        .and("contain", "commented");
});
 });
    });
});
