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
        it('User A sends a payment to User B', () => {
    // Log in as User A
                 cy.loginByXstate(ctx.userA.username);
                 // Navigate to the new transaction page
                 cy.getBySelLike("new-transaction").click();
                 cy.wait("@getNotifications");
                 // Search for User B
                 cy.getBySel("user-list-search-input").type(ctx.userB.username);
                 cy.wait(500);
                 // Select User B from the search results
                 cy.getBySelLike(`user-list-item-${ctx.userB.username}`).click();
                 // Enter an amount to pay
                 const amount = "10.00";
                 cy.getBySel("transaction-create-amount-input").type(amount);
                 // Add a note
                 const note = "Payment for services";
                 cy.getBySel("transaction-create-description-input").type(note);
                 // Submit the transaction
                 cy.getBySel("transaction-create-submit-button").click();
                 cy.wait("@createTransaction").then((interception) => {
                     expect(interception.response.statusCode).to.equal(200);
  });
    });
});
