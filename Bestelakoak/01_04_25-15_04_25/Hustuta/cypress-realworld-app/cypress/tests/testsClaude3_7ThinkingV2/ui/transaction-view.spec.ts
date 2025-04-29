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
        // Get the first transaction from the feed
        cy.getBySel("transaction-item")
            .first()
            .click();
        
        cy.wait("@getTransaction");
        
        // Verify navigation tabs are not visible
        cy.getBySel("nav-transaction-tabs").should("not.exist");
        cy.getBySel("nav-public-tab").should("not.exist");
        cy.getBySel("nav-contacts-tab").should("not.exist");
        cy.getBySel("nav-personal-tab").should("not.exist");
    });
    
    it("likes a transaction", () => {
        // Get the first transaction from the feed
        cy.getBySel("transaction-item")
            .first()
            .click();
        
        cy.wait("@getTransaction");
        
        // Click like button
        cy.getBySel("like-button").click();
        
        // Verify like count increases
        cy.getBySel("like-count").should("contain", "1");
        cy.getBySel("like-button").should("have.class", "MuiButton-contained");
    });
    
    it("comments on a transaction", () => {
        // Get the first transaction from the feed
        cy.getBySel("transaction-item")
            .first()
            .click();
        
        cy.wait("@getTransaction");
        
        // Add a comment
        cy.getBySel("comment-input").type("This is a test comment");
        cy.getBySel("comment-submit").click();
        
        // Verify comment appears in the list
        cy.getBySel("comments-list")
            .should("contain", "This is a test comment");
    });
    
    it("accepts a transaction request", () => {
        // Navigate to the pending request transaction
        if (ctx.transactionRequest) {
            cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        } else {
            throw new Error("Transaction request is undefined");
        }
        cy.wait("@getTransaction");

        // Click accept button
        cy.getBySel("transaction-accept-request").click();
        cy.wait("@updateTransaction");
        
        // Verify the transaction status changes
        cy.getBySel("transaction-detail-header")
            .should("contain", "Accepted");
    });
    
    it("rejects a transaction request", () => {
        // Navigate to the pending request transaction
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");

        // Click reject button
        cy.getBySel("transaction-reject-request").click();
        cy.wait("@updateTransaction");
        
        // Verify the transaction status changes
        cy.getBySel("transaction-detail-header")
            .should("contain", "Rejected");
    });
    
    it("does not display accept/reject buttons on completed request", () => {
        // Find a transaction that's been completed
        cy.database("find", "transactions", {
            requestStatus: { $ne: "pending" }
        }).then(transaction => {
            // Navigate to that transaction
            cy.visit(`/transaction/${transaction.id}`);
            cy.wait("@getTransaction");
            
            // Verify accept/reject buttons are not visible
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
        });
    });
});
