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
            cy.log("More info needed to confirm how to like transaction and check notifications.");
        });
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
            cy.log("No user data or transaction context. Additional info required.");
        });
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
            cy.log("Additional details needed. No direct user info to test comment features.");
        });
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
            cy.log("No user data available for this scenario. More info needed.");
        });
        it("User A sends a payment to User B", () => {
            cy.log("Need account details or user info to confirm notification test steps.");
        });
        it("User A sends a payment request to User C", () => {
            cy.log("No user info for user C to confirm request or notifications. More info needed.");
        });
    });
    it("renders an empty notifications state", () => {
        cy.log("No data to simulate an empty state. More info needed to fully implement test.");
    });
});
