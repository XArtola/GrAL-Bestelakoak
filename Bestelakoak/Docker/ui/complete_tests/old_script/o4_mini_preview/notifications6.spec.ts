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
// Log in as User A and create a new payment request to User C  

cy.loginByXstate(ctx.userA.username);  

cy.visit("/");  

// Open the "New Transaction" flow  

cy.getBySel("new-transaction").click();  

// Search for User C and select them  

cy.getBySelLike("user-list-search-input").type(ctx.userC.firstName);  

cy.getBySelLike("user-list-item").first().click();  

// Switch to the "Request" tab (if the UI has separate tabs)  

cy.getBySel("request-tab").click();  

// Enter amount and description  

const requestAmount = "75";  

const requestNote = "Request notification test";  

cy.getBySel("amount-input").type(requestAmount);  

cy.getBySel("transaction-create-description-input").type(requestNote);  

// Submit the payment request  

cy.getBySel("submit-request").click();  

// Wait for the backend transaction call to complete  

cy.wait("@createTransaction");  



// Now log in as User C to verify they received a notification  

cy.loginByXstate(ctx.userC.username);  

// Visit the notifications page  

cy.visit("/notifications");  

// Assert that there's a notification from User A mentioning "requested"  

cy.getBySel("notification-list-item")  

.should("contain", ctx.userA.firstName)  

.and("contain", "requested");
 });
    });
});
