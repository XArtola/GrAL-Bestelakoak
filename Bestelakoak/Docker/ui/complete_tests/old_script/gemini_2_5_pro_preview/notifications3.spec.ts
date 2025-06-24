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
let transactionId: string;



// Step 1: Login as User B and create a transaction (e.g., B to C)

cy.loginByXstate(ctx.userB.username);

cy.visit("/transaction/new");



// Select User C as the recipient

cy.getBySel("user-list-search-input").type(ctx.userC.firstName);

cy.getBySel("user-list-item").contains(ctx.userC.firstName).first().click();



// Fill in transaction details

cy.getBySel("amount-input").type("150");

cy.getBySel("transaction-create-description-input").type(`Transaction from ${ctx.userB.firstName} to ${ctx.userC.firstName} for comment test`);

cy.getBySel("transaction-create-submit-payment").click();

cy.wait("@createTransaction");



// Get the transaction ID from the URL

cy.url().should('include', '/transaction/').then(url => {

const parts = url.split('/');

transactionId = parts[parts.length - 1];

expect(transactionId).to.not.be.empty;

});



// Step 2: Logout User B

cy.getBySel("sidenav-signout").click();



// Step 3: Login as User A

cy.loginByXstate(ctx.userA.username);

cy.wait("@getNotifications"); // Wait for initial notifications



// Step 4: User A navigates to the transaction and posts a comment

cy.visit(`/transaction/${transactionId}`);

const commentText = `A test comment by ${ctx.userA.firstName} ${ctx.userA.lastName}.`;

cy.getBySel("comment-input").type(commentText);

cy.getBySel("comment-submit").click();

cy.wait("@postComment");



// Verify the comment appears on the transaction page for User A

cy.contains(commentText).should("be.visible");



// Step 5: Logout User A

cy.getBySel("sidenav-signout").click();



// Step 6: Login as User B

cy.loginByXstate(ctx.userB.username);

cy.wait("@getNotifications"); // Wait for notifications to load for User B



// Step 7: User B checks notifications

// Navigate to home or a page where notification icon is visible, then click it

cy.visit("/"); 

cy.wait("@getNotifications"); // Ensure notifications are fetched on home page

cy.getBySel("nav-top-notifications-link").click(); 

// Potentially wait again if clicking the link triggers a new fetch or navigation

// cy.wait("@getNotifications"); 



// Step 8: Assert User B received the notification from User A

cy.getBySel("notification-list-item")

.first() // Assuming the latest notification is at the top

.should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName}`)

.and("contain", "commented"); // Common notification text for comments
 });
    });
});
