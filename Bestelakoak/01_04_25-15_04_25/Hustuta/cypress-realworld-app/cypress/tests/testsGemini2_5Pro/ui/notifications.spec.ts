import { isMobile } from "../../support/utils";
import { User, Transaction } from "../../../src/models";

type NotificationsCtx = {
    userA: User;
    userB: User;
    userC: User;
    transactionAB?: Transaction;
    transactionBC?: Transaction;
};

describe("Notifications", function () {
    const ctx = {} as NotificationsCtx;
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/notifications*").as("getNotifications");
        cy.intercept("POST", "/transactions").as("createTransaction");
        cy.intercept("PATCH", "/notifications/*").as("updateNotification");
        cy.intercept("POST", "/comments/*").as("postComment");
        cy.intercept("POST", "/likes/*").as("postLike"); // Add intercept for likes

        cy.database("filter", "users").then((users: User[]) => {
            ctx.userA = users[0];
            ctx.userB = users[1];
            ctx.userC = users[2];

            // Create transactions for testing interactions
            cy.database("create", "transaction", {
              senderId: ctx.userA.id,
              receiverId: ctx.userB.id,
              amount: 5000, // $50.00
              description: "Test transaction A->B",
              requestStatus: "paid",
              status: "complete",
            }).then((tx) => ctx.transactionAB = tx);

            cy.database("create", "transaction", {
              senderId: ctx.userB.id,
              receiverId: ctx.userC.id,
              amount: 2500, // $25.00
              description: "Test transaction B->C",
              requestStatus: "paid",
              status: "complete",
            }).then((tx) => ctx.transactionBC = tx);
        });
    });

    describe("notifications from user interactions", function () {
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => {
          // Login as User A
          cy.loginByXstate(ctx.userA.username);

          // Find User B's transaction (B->C) and like it
          cy.visit("/"); // Go to public feed
          cy.wait("@publicTransactions"); // Assuming public feed loads transactions
          cy.getBySelLike("transaction-item")
            .contains(ctx.transactionBC!.description)
            .parents("[data-test*=transaction-item]")
            .find("[data-test*=transaction-like-button]")
            .click();
          cy.wait("@postLike");

          // Logout User A
          cy.logoutByXstate();

          // Login as User B
          cy.loginByXstate(ctx.userB.username);

          // Check notifications
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} liked your transaction`);
        });

        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
          // Login as User C
          cy.loginByXstate(ctx.userC.username);

          // Find transaction A->B and like it
          cy.visit("/");
          cy.wait("@publicTransactions");
          cy.getBySelLike("transaction-item")
            .contains(ctx.transactionAB!.description)
            .parents("[data-test*=transaction-item]")
            .find("[data-test*=transaction-like-button]")
            .click();
          cy.wait("@postLike");

          // Logout User C
          cy.logoutByXstate();

          // Login as User A and check notifications
          cy.loginByXstate(ctx.userA.username);
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
          cy.logoutByXstate();

          // Login as User B and check notifications
          cy.loginByXstate(ctx.userB.username);
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
        });

        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
          const commentText = "Nice transaction!";
          // Login as User A
          cy.loginByXstate(ctx.userA.username);

          // Find User B's transaction (B->C) and comment
          cy.visit("/");
          cy.wait("@publicTransactions");
          cy.getBySelLike("transaction-item")
            .contains(ctx.transactionBC!.description)
            .click(); // Navigate to transaction detail
          cy.getBySel("transaction-comment-input").type(commentText + "{enter}");
          cy.wait("@postComment");

          // Logout User A
          cy.logoutByXstate();

          // Login as User B
          cy.loginByXstate(ctx.userB.username);

          // Check notifications
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} commented on your transaction`);
        });

        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
          const commentText = "Interesting deal!";
          // Login as User C
          cy.loginByXstate(ctx.userC.username);

          // Find transaction A->B and comment
          cy.visit("/");
          cy.wait("@publicTransactions");
          cy.getBySelLike("transaction-item")
            .contains(ctx.transactionAB!.description)
            .click(); // Navigate to transaction detail
          cy.getBySel("transaction-comment-input").type(commentText + "{enter}");
          cy.wait("@postComment");

          // Logout User C
          cy.logoutByXstate();

          // Login as User A and check notifications
          cy.loginByXstate(ctx.userA.username);
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
          cy.logoutByXstate();

          // Login as User B and check notifications
          cy.loginByXstate(ctx.userB.username);
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
        });

        it("User A sends a payment to User B", () => {
          const paymentAmount = 30;
          const paymentDescription = "Payment for lunch";
          // Login as User A
          cy.loginByXstate(ctx.userA.username);

          // Create payment transaction
          cy.getBySelLike("new-transaction").click();
          cy.wait("@allUsers");
          cy.getBySel("user-list-item-" + ctx.userB.id).click();
          cy.getBySel("amount-input").type(paymentAmount.toString());
          cy.getBySel("transaction-create-description-input").type(paymentDescription);
          cy.getBySel("transaction-create-submit-payment").click();
          cy.wait("@createTransaction");

          // Logout User A
          cy.logoutByXstate();

          // Login as User B
          cy.loginByXstate(ctx.userB.username);

          // Check notifications
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} paid you`);
        });

        it("User A sends a payment request to User C", () => {
          const requestAmount = 75;
          const requestDescription = "Request for concert tickets";
          // Login as User A
          cy.loginByXstate(ctx.userA.username);

          // Create request transaction
          cy.getBySelLike("new-transaction").click();
          cy.wait("@allUsers");
          cy.getBySel("user-list-item-" + ctx.userC.id).click();
          cy.getBySel("amount-input").type(requestAmount.toString());
          cy.getBySel("transaction-create-description-input").type(requestDescription);
          cy.getBySel("transaction-create-submit-request").click();
          cy.wait("@createTransaction");

          // Logout User A
          cy.logoutByXstate();

          // Login as User C
          cy.loginByXstate(ctx.userC.username);

          // Check notifications
          cy.getBySel("nav-top-notifications-link").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-list-item")
            .should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} requested payment`);
        });
    });

    it("renders an empty notifications state", () => {
      // Login as a user expected to have no notifications (e.g., User C initially)
      cy.loginByXstate(ctx.userC.username);

      // Navigate to notifications
      cy.getBySel("nav-top-notifications-link").click();
      cy.wait("@getNotifications");

      // Assert the empty state message
      cy.getBySel("notification-list").should("contain", "No Notifications"); // Adjust selector/text if needed
    });
});
