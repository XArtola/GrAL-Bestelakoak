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
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => {
// ...existing code...
describe("Notifications", function () {
    const ctx = {} as NotificationsCtx;
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/notifications*").as("getNotifications");
        cy.intercept("POST", "/transactions").as("createTransaction");
        cy.intercept("PATCH", "/notifications/*").as("updateNotification");
        cy.intercept("POST", "/comments/*").as("postComment");
        // For robust testing of likes, an intercept for POST /likes/* would be beneficial here.
        // e.g., cy.intercept("POST", "/likes/*").as("postLike");
        cy.database("filter", "users").then((users: User[]) => {
            ctx.userA = users[0];
            ctx.userB = users[1];
            ctx.userC = users[2];
        });
    });
    describe("notifications from user interactions", function () {
        // User A likes a transaction of User B; User B gets notification that User A liked transaction
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => {
<generated_code>
            // Step 1: User B logs in and creates a transaction (e.g., pays User C)
            // This transaction will be "a transaction of User B"
            cy.loginByXstate(ctx.userB.username);

            cy.getBySel("new-transaction").click();
            // Select User C as the recipient
            cy.getBySel("user-list-search-input").type(ctx.userC.firstName);
            cy.getBySel("user-list-item").contains(ctx.userC.firstName).click({ force: true }); // Added force true for potential visibility issues
            cy.getBySel("amount-input").type("25"); // Amount in dollars
            cy.getBySel("transaction-create-description-input").type("Test transaction from B to C for A to like");
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");

            // Step 2: Capture the transaction ID from the URL
            let transactionId: string;
            cy.url().then(url => {
                transactionId = url.split("/").pop()!;
                expect(transactionId).to.not.be.empty;
            });

            // Step 3: User B logs out
            cy.getBySel("sidenav-signout").click();

            // Step 4: User A logs in
            cy.loginByXstate(ctx.userA.username);

            // Step 5: User A visits the transaction created by User B
            cy.visit(`/transaction/${transactionId}`);

            // Step 6: User A likes the transaction
            cy.getBySel("like-button").click();
            // Optionally, wait for the like to be processed if cy.intercept("POST", "/likes/*").as("postLike"); was added in beforeEach
            // cy.wait("@postLike"); 
            cy.getBySel("transaction-like-count").should("contain", "1");

            // Step 7: User A logs out
            cy.getBySel("sidenav-signout").click();

            // Step 8: User B logs in again
            cy.loginByXstate(ctx.userB.username);

            // Step 9: User B checks notifications
            // Notifications link could be in sidenav or top nav. Using a common selector.
            cy.getBySel("sidenav-notifications").click();
            cy.wait("@getNotifications");

            // Step 10: Verify User B received a notification about User A's like
            // The notification text might vary, adjust if necessary.
            cy.getBySel("notification-list-item")
                .first()
                .should("be.visible")
                .and("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} liked your transaction`);
</generated_code>
        });
    });
});
// ...existing code...
 });
    });
});
