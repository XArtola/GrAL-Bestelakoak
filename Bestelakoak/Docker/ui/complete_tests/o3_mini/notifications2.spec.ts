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
        it('User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction', () => {
    // "User C likes a transaction between User A and User B; User A and User B get notifications that User C liked transaction"

    // Step 1: Log in as User C (using API login for speed; adjust credentials as needed)
    cy.loginByApi(ctx.userC.username, "s3cret");

    // Step 2: Set up a transaction between User A and User B.
    // We simulate creating a transaction via a POST request.
    cy.request({
        method: "POST",
        url: "/transactions",
        body: {
            senderId: ctx.userA.id,
            receiverId: ctx.userB.id,
            description: "Test Transaction between User A and User B",
            amount: 100,
            type: "payment"
        }
    }).then((transactionResp) => {
        const transaction = transactionResp.body;
        expect(transaction).to.have.property("id");

        // Step 3: Simulate User C liking the transaction.
        cy.request({
            method: "POST",
            url: "/likes",
            body: {
                userId: ctx.userC.id,
                transactionId: transaction.id
            }
        }).then((likeResp) => {
            expect(likeResp.status).to.eq(200);

            // Step 4: Wait for the notifications request to run.
            cy.wait("@getNotifications");

            // Step 5: Verify that User A received a notification about the like.
            cy.request({
                method: "GET",
                url: `/notifications?userId=${ctx.userA.id}`
            }).then((notifRespA) => {
                expect(notifRespA.body).to.be.an("array");
                const userANotif = notifRespA.body.find(notif => 
                    notif.transactionId === transaction.id &&
                    notif.message && notif.message.includes(ctx.userC.username)
                );
                expect(userANotif).to.exist;
            });

            // Step 6: Verify that User B received a notification about the like.
            cy.request({
                method: "GET",
                url: `/notifications?userId=${ctx.userB.id}`
            }).then((notifRespB) => {
                expect(notifRespB.body).to.be.an("array");
                const userBNotif = notifRespB.body.find(notif => 
                    notif.transactionId === transaction.id &&
                    notif.message && notif.message.includes(ctx.userC.username)
                );
                expect(userBNotif).to.exist;
            });
        });
    });
  });
    });
});
