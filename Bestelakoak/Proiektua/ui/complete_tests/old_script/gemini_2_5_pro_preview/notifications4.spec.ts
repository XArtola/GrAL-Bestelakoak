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
const transactionAmount = "125";

const transactionDescription = "Test transaction for comment by User C";

const commentText = "User C's insightful comment on this transaction.";

let transactionId: string;



// Step 1: User A creates a transaction with User B

cy.loginByXstate(ctx.userA.username);

cy.getBySel("nav-top-new-transaction").click();

cy.getBySel("user-list-search-input").type(ctx.userB.firstName);

cy.getBySel("user-list-item").contains(`${ctx.userB.firstName} ${ctx.userB.lastName}`).click();

cy.getBySel("amount-input").type(transactionAmount);

cy.getBySel("transaction-create-description-input").type(transactionDescription);

cy.getBySel("transaction-create-submit-payment").click();

cy.wait("@createTransaction");



// Capture the transaction ID from the URL

cy.url().then(url => {

transactionId = url.split("/").pop()!;

});



cy.getBySel("sidenav-signout").click();



// Step 2: User C logs in and comments on the transaction

cy.loginByXstate(ctx.userC.username);

cy.visit(`/transaction/${transactionId}`);

cy.getBySel("comment-input").type(commentText);

cy.getBySel("comment-submit").click();

cy.wait("@postComment");

cy.getBySel("comments-list").should("contain", commentText);

cy.getBySel("sidenav-signout").click();



// Step 3: User A checks for notification from User C

cy.loginByXstate(ctx.userA.username);

cy.visit("/"); 

cy.wait("@getNotifications");

cy.getBySel("nav-top-notifications-link").click();

cy.getBySel("notification-list-item")

.first()

.should("be.visible")

.and("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);

cy.getBySel("sidenav-signout").click();



// Step 4: User B checks for notification from User C

cy.loginByXstate(ctx.userB.username);

cy.visit("/");

cy.wait("@getNotifications");

cy.getBySel("nav-top-notifications-link").click();

cy.getBySel("notification-list-item")

.first()

.should("be.visible")

.and("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
 });
    });
});
