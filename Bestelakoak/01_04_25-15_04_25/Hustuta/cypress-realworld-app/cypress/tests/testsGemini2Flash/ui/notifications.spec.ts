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
        // User A likes a transaction of User B; User B gets notification that User A liked transaction
        it("User A likes a transaction of User B; User B gets notification that User A liked transaction ", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\notifications.spec.ts
          cy.loginByXstate(ctx.userA.username);
          cy.visit("/");
          cy.getBySel("nav-public-tab").click();
          cy.wait(500);
          cy.getBySelLike("transaction-item").contains(ctx.userB.username).first().click();
          cy.getBySel("transaction-like-button").click();
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userB.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} liked your transaction`);
        });

        // User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction
        it("User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\notifications.spec.ts
          cy.loginByXstate(ctx.userC.username);
          cy.visit("/");
          cy.getBySel("nav-public-tab").click();
          cy.wait(500);
          cy.getBySelLike("transaction-item").contains(ctx.userA.username).first().click();
          cy.getBySel("transaction-like-button").click();
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userA.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userB.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} liked your transaction`);
        });

        // User A comments on a transaction of User B; User B gets notification that User A commented on their transaction
        it("User A comments on a transaction of User B; User B gets notification that User A commented on their transaction", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\notifications.spec.ts
          const comment = "Great transaction!";
          cy.loginByXstate(ctx.userA.username);
          cy.visit("/");
          cy.getBySel("nav-public-tab").click();
          cy.wait(500);
          cy.getBySelLike("transaction-item").contains(ctx.userB.username).first().click();
          cy.getBySel("transaction-comment-input").type(comment);
          cy.getBySel("transaction-comment-submit").click();
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userB.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} commented on your transaction`);
        });

        // User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction
        it("User C comments on a transaction between User A and User B; User A and B get notifications that User C commented on their transaction", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\notifications.spec.ts
          const comment = "Interesting!";
          cy.loginByXstate(ctx.userC.username);
          cy.visit("/");
          cy.getBySel("nav-public-tab").click();
          cy.wait(500);
          cy.getBySelLike("transaction-item").contains(ctx.userA.username).first().click();
          cy.getBySel("transaction-comment-input").type(comment);
          cy.getBySel("transaction-comment-submit").click();
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userA.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userB.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userC.firstName} ${ctx.userC.lastName} commented on your transaction`);
        });

        // User A sends a payment to User B
        it("User A sends a payment to User B", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\notifications.spec.ts
          cy.loginByXstate(ctx.userA.username);
          cy.visit("/");
          cy.getBySelLike("new-transaction").click();
          cy.getBySel("user-list-search-input").type(ctx.userB.username);
           cy.wait("@usersSearch");
          cy.getBySelLike("user-list-item").contains(ctx.userB.username).click();
          cy.getBySel("transaction-amount-input").type("50");
          cy.getBySel("transaction-description-input").type("Payment for services");
          cy.getBySel("transaction-submit-payment").click();
          cy.wait("@createTransaction");
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userB.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} sent you $50.00`);
        });

        // User A sends a payment request to User C
        it("User A sends a payment request to User C", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\notifications.spec.ts
          cy.loginByXstate(ctx.userA.username);
          cy.visit("/");
          cy.getBySelLike("new-transaction").click();
          cy.getBySel("user-list-search-input").type(ctx.userC.username);
          cy.wait("@usersSearch");
          cy.getBySelLike("user-list-item").contains(ctx.userC.username).click();
          cy.getBySel("transaction-amount-input").type("75");
          cy.getBySel("transaction-description-input").type("Request for rent");
          cy.getBySel("transaction-submit-request").click();
          cy.wait("@createTransaction");
          cy.logoutByXstate();

          cy.loginByXstate(ctx.userC.username);
          cy.visit("/");
          cy.getBySel("sidenav-notifications").click();
          cy.wait("@getNotifications");
          cy.getBySelLike("notification-item").should("contain", `${ctx.userA.firstName} ${ctx.userA.lastName} is requesting $75.00`);
        });
    });

    // renders an empty notifications state
    it("renders an empty notifications state", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\notifications.spec.ts
      cy.database("filter", "users").then((users: User[]) => {
        const userD = users[3];
        cy.loginByXstate(userD.username);
        cy.visit("/");
        cy.getBySel("sidenav-notifications").click();
        cy.wait("@getNotifications");
        cy.getBySel("empty-notifications").should("be.visible");
      });
    });
});
