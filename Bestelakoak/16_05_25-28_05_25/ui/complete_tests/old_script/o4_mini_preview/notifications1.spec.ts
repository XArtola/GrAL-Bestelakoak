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
// 1. Log in as User B and create a transaction (need route & selectors):

//    cy.loginByXstate(ctx.userB.username);

//    cy.visit("/transaction/new");

//    cy.getBySel("user-list-item").contains(ctx.userC.firstName).click();

//    cy.getBySel("amount-input").type("50");

//    cy.getBySel("transaction-create-submit-payment").click();

//    cy.wait("@createTransaction");

//    cy.url().then(url => { transactionId = url.split("/").pop()!; });



// 2. Log out and log in as User A then like that transaction (need like-button selector):

//    cy.getBySel("sidenav-signout").click();

//    cy.loginByXstate(ctx.userA.username);

//    cy.visit(`/transaction/${transactionId}`);

//    cy.getBySel("like-button").click();



// 3. Log out and log back in as User B to verify notification (need notification selector/text):

//    cy.getBySel("sidenav-signout").click();

//    cy.loginByXstate(ctx.userB.username);

//    cy.visit("/");

//    cy.wait("@getNotifications");

//    cy.getBySel("nav-top-notifications-count").should("contain", "1");

//    cy.getBySel("nav-top-notifications-link").click();

//    cy.getBySelLike("notification-list-item")

//      .first()

//      .should("contain", `${ctx.userA.firstName} liked your transaction`);
 });
    });
});
