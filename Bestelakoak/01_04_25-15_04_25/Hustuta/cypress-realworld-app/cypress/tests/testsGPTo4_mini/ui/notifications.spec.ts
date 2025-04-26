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
            // TODO: Implement test. Need UI selectors and details of seeded User B transaction to perform like and assertion.
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            // TODO: Implement test. Need UI selectors and seeded transactions to simulate like action.
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            // TODO: Implement test. Need UI selectors and seeded data for comment action.
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            // TODO: Implement test. Need UI selectors and seeded transactions for comment.
        });
        it("User A sends a payment to User B", () => {
            // TODO: Implement test. Need details of payment transaction endpoint and UI flow.
        });
        it("User A sends a payment request to User C", () => {
            // TODO: Implement test. Need request flow selectors and data.
        });
    });
    it("renders an empty notifications state", () => {
        // TODO: Implement test. Need selectors for empty state notification UI.
    });
});
