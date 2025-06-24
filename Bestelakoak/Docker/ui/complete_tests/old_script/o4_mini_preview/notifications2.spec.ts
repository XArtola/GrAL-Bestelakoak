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
// Create a transaction between User A and User B via DB

cy.database('create', 'transaction', {

senderId: ctx.userA.id,

receiverId: ctx.userB.id,

amount: 1000, // amount in cents

description: 'Auto-generated transaction for like test',

requestStatus: 'paid',

status: 'complete',

}).then((transaction: Transaction) => {

// Login as User C and like the transaction

cy.loginByXstate(ctx.userC.username);

cy.visit(`/transaction/${transaction.id}`);

cy.getBySelLike('like-button').click();



// Verify User A receives a like notification

cy.loginByXstate(ctx.userA.username);

cy.visit('/notifications');

cy.wait('@getNotifications');

cy.getBySelLike('notification-list-item')

.first()

.should('contain', `${ctx.userC.firstName} ${ctx.userC.lastName}`)

.and('contain', 'liked your transaction');



// Verify User B receives a like notification

cy.loginByXstate(ctx.userB.username);

cy.visit('/notifications');

cy.wait('@getNotifications');

cy.getBySelLike('notification-list-item')

.first()

.should('contain', `${ctx.userC.firstName} ${ctx.userC.lastName}`)

.and('contain', 'liked your transaction');

});
 });
    });
});
