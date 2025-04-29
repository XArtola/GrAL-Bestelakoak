import { User, Transaction } from "../../../src/models";
type NewTransactionCtx = {
    transactionRequest?: Transaction;
    authenticatedUser?: User;
};
describe("Transaction View", function () {
    const ctx: NewTransactionCtx = {};
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/transactions*").as("personalTransactions");
        cy.intercept("GET", "/transactions/public*").as("publicTransactions");
        cy.intercept("GET", "/transactions/*").as("getTransaction");
        cy.intercept("PATCH", "/transactions/*").as("updateTransaction");
        cy.intercept("GET", "/checkAuth").as("userProfile");
        cy.intercept("GET", "/notifications").as("getNotifications");
        cy.intercept("GET", "/bankAccounts").as("getBankAccounts");
        cy.database("find", "users").then((user: User) => {
            ctx.authenticatedUser = user;
            if (ctx.authenticatedUser) {
                cy.loginByXstate(ctx.authenticatedUser.username);
            }
            cy.database("find", "transactions", {
                receiverId: ctx.authenticatedUser.id,
                status: "pending",
                requestStatus: "pending",
                requestResolvedAt: "",
            }).then((transaction: Transaction) => {
                ctx.transactionRequest = transaction;
            });
        });
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
    });
    // transactions navigation tabs are hidden on a transaction view page
    it("transactions navigation tabs are hidden on a transaction view page", () => {
        // <generated_code>
        cy.getBySelLike("transaction-item").first().click();
        cy.getBySel("nav-personal-tab").should("not.exist");
        cy.getBySel("nav-public-tab").should("not.exist");
        cy.getBySel("nav-contacts-tab").should("not.exist");
        // </generated_code>
    });

    // likes a transaction
    it("likes a transaction", () => {
        // <generated_code>
        cy.getBySelLike("transaction-item").first().click();
        cy.getBySel("like-button").click();
        cy.getBySel("like-count").should("contain", "1");
        // </generated_code>
    });

    // comments on a transaction
    it("comments on a transaction", () => {
        // <generated_code>
        cy.getBySelLike("transaction-item").first().click();
        cy.getBySel("comment-input").type("Test comment");
        cy.getBySel("comment-submit").click();
        cy.getBySel("comment-message").should("contain", "Test comment");
        // </generated_code>
    });

    // accepts a transaction request
    it("accepts a transaction request", () => {
        // <generated_code>
        if (ctx.transactionRequest) {
            cy.getBySelLike("transaction-item").first().click();
            cy.getBySel("transaction-accept-request").click();
            cy.wait("@updateTransaction").then((interception) => {
                assert.equal(interception.response?.statusCode, 200);
            });
            cy.getBySel("transaction-status").should("contain", "Complete");
        } else {
            cy.log("No transaction request found for this user.");
        }
        // </generated_code>
    });

    // rejects a transaction request
    it("rejects a transaction request", () => {
        // <generated_code>
        if (ctx.transactionRequest) {
            cy.getBySelLike("transaction-item").first().click();
            cy.getBySel("transaction-reject-request").click();
            cy.wait("@updateTransaction").then((interception) => {
                assert.equal(interception.response?.statusCode, 200);
            });
        } else {
            cy.log("No transaction request found for this user.");
        }
        // </generated_code>
    });

    // does not display accept/reject buttons on completed request
    it("does not display accept/reject buttons on completed request", () => {
        // <generated_code>
        cy.getBySelLike("transaction-item").first().click();
        cy.getBySel("transaction-accept-request").should("not.exist");
        cy.getBySel("transaction-reject-request").should("not.exist");
        // </generated_code>
    });
});
