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
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => { });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => { });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => { });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => { });
        it("User A sends a payment to User B", () => { });
        it("User A sends a payment request to User C", () => { });
    });
    it("renders an empty notifications state", () => { });
});
