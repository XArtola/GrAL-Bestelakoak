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
            cy.loginByXstate(ctx.authenticatedUser.username);
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
    it("transactions navigation tabs are hidden on a transaction view page", () => {
        // Click first transaction in feed
        cy.getBySel("transaction-list-item").first().click();
        cy.wait("@getTransaction");
        
        // Verify navigation tabs are not visible
        cy.getBySel("nav-transaction-tabs").should("not.exist");
        cy.getBySel("transaction-detail-header").should("be.visible");
    });

    it("likes a transaction", () => {
        cy.getBySel("transaction-list-item").first().click();
        cy.wait("@getTransaction");
        
        // Click like button and verify state changes
        cy.getBySel("like-button").click();
        cy.getBySel("like-count").should("contain", "1");
        cy.getBySel("like-button").should("have.class", "MuiButton-contained");
    });

    it("comments on a transaction", () => {
        cy.getBySel("transaction-list-item").first().click();
        cy.wait("@getTransaction");
        
        // Add comment
        const comment = "Test comment";
        cy.getBySel("comment-input").type(comment);
        cy.getBySel("comment-submit").click();
        
        // Verify comment appears
        cy.getBySel("comments-list").should("be.visible")
          .and("contain", comment);
    });

    it("accepts a transaction request", () => {
        cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
        cy.wait("@getTransaction");

        // Accept request
        cy.getBySel("transaction-accept-request").click();
        cy.wait("@updateTransaction");

        // Verify accepted state
        cy.getBySel("transaction-accept-request").should("not.exist");
        cy.getBySel("transaction-detail-header")
          .should("contain", "Completed");
    });

    it("rejects a transaction request", () => {
        cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
        cy.wait("@getTransaction");

        // Reject request  
        cy.getBySel("transaction-reject-request").click();
        cy.wait("@updateTransaction");

        // Verify rejected state
        cy.getBySel("transaction-reject-request").should("not.exist");
        cy.getBySel("transaction-detail-header")
          .should("contain", "Declined");
    });

    it("does not display accept/reject buttons on completed request", () => {
        // Visit a completed transaction
        cy.database("find", "transactions", {
            status: "complete"
        }).then(transaction => {
            cy.visit(`/transaction/${transaction.id}`);
            cy.wait("@getTransaction");
            
            // Verify accept/reject buttons not present
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
        });
    });
});
