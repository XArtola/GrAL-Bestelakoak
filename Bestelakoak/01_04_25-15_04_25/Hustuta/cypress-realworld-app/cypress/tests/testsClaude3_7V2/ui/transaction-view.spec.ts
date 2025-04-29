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
        // Find and click on a transaction in the personal feed
        cy.getBySel("transaction-item").first().click();
        cy.wait("@getTransaction");
        
        // Verify that transaction navigation tabs are hidden on the detail view
        cy.getBySel("nav-transaction-tabs").should("not.exist");
        
        // Verify that we're on the transaction detail page
        cy.getBySel("transaction-detail").should("be.visible");
        cy.getBySel("transaction-detail-header").should("be.visible");
        
        // Verify the back to transactions button is visible
        cy.getBySel("transaction-detail-return").should("be.visible");
        
        // Click back to transactions to return to the list view
        cy.getBySel("transaction-detail-return").click();
        
        // Verify that transaction tabs are visible again
        cy.getBySel("nav-transaction-tabs").should("be.visible");
    });
    
    it("likes a transaction", () => {
        // Find and click on a transaction in the personal feed
        cy.getBySel("transaction-item").first().click();
        cy.wait("@getTransaction");
        
        // Get the initial like count
        let initialLikeCount: number;
        cy.getBySel("like-count")
            .invoke("text")
            .then((text) => {
                initialLikeCount = parseInt(text || "0");
            });
        
        // Like the transaction
        cy.getBySel("like-button").click();
        
        // Verify the like count increased by 1
        cy.getBySel("like-count").should(($el) => {
            const newLikeCount = parseInt($el.text() || "0");
            expect(newLikeCount).to.equal(initialLikeCount + 1);
        });
        
        // Click the like button again to unlike
        cy.getBySel("like-button").click();
        
        // Verify the like count decreased by 1
        cy.getBySel("like-count").should(($el) => {
            const newLikeCount = parseInt($el.text() || "0");
            expect(newLikeCount).to.equal(initialLikeCount);
        });
    });
    
    it("comments on a transaction", () => {
        // Find and click on a transaction in the personal feed
        cy.getBySel("transaction-item").first().click();
        cy.wait("@getTransaction");
        
        // Type a comment
        const comment = "This is a test comment!";
        cy.getBySel("comment-input").type(comment);
        
        // Submit the comment
        cy.getBySel("comment-submit").click();
        
        // Verify the new comment is displayed in the comments list
        cy.getBySel("comments-list")
            .should("contain", comment)
            .and("contain", ctx.authenticatedUser!.firstName);
    });
    
    it("accepts a transaction request", () => {
        // Navigate directly to the transaction request detail page if we have one
        if (ctx.transactionRequest) {
            cy.visit(`/transaction/${ctx.transactionRequest.id}`);
            cy.wait("@getTransaction");
            
            // Verify it's a pending request
            cy.getBySel("transaction-detail-header").should("contain", "requested");
            cy.getBySel("transaction-accept-request").should("be.visible");
            cy.getBySel("transaction-reject-request").should("be.visible");
            
            // Accept the request
            cy.getBySel("transaction-accept-request").click();
            cy.wait("@updateTransaction");
            
            // Verify the transaction status changed to "paid"
            cy.getBySel("transaction-detail-header").should("contain", "paid");
            
            // Verify accept/reject buttons are no longer displayed
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
        } else {
            // Skip this test if no transaction request is available
            cy.log("No pending transaction request available to test");
        }
    });
    
    it("rejects a transaction request", () => {
        // Create a new transaction request to test rejection
        cy.database("find", "users").then((users) => {
            const sender = users.find((user: User) => user.id !== ctx.authenticatedUser!.id);
            
            // Create a transaction request
            const transactionRequest = {
                senderId: sender.id,
                receiverId: ctx.authenticatedUser!.id,
                description: "Test reject request",
                amount: 100,
                status: "pending",
                requestStatus: "pending",
                requestResolvedAt: "",
            };
            
            cy.task("db:createTransaction", transactionRequest).then((transaction) => {
                const typedTransaction = transaction as Transaction;
                cy.visit(`/transaction/${typedTransaction.id}`);
                cy.visit(`/transaction/${(transaction as Transaction).id}`);
                cy.wait("@getTransaction");
                
                // Verify it's a pending request
                cy.getBySel("transaction-detail-header").should("contain", "requested");
                cy.getBySel("transaction-reject-request").should("be.visible");
                
                // Reject the request
                cy.getBySel("transaction-reject-request").click();
                cy.wait("@updateTransaction");
                
                // Verify the transaction status changed to "rejected"
                cy.getBySel("transaction-detail-header").should("contain", "rejected");
                
                // Verify accept/reject buttons are no longer displayed
                cy.getBySel("transaction-accept-request").should("not.exist");
                cy.getBySel("transaction-reject-request").should("not.exist");
            });
        });
    });
    
    it("does not display accept/reject buttons on completed request", () => {
        // Create a completed transaction
        cy.database("find", "users").then((users) => {
            const sender = users.find((user: User) => user.id !== ctx.authenticatedUser!.id);
            
            // Create a completed transaction
            const completedTransaction = {
                senderId: sender.id,
                receiverId: ctx.authenticatedUser!.id,
                description: "Already completed request",
                amount: 50,
                status: "complete",
                requestStatus: "accepted",
                requestResolvedAt: new Date().toISOString(),
            };
            
            cy.task("db:createTransaction", completedTransaction).then((transaction) => {
                const typedTransaction = transaction as Transaction;
                // Navigate to the transaction
                cy.visit(`/transaction/${(transaction as Transaction).id}`);
                cy.wait("@getTransaction");
                
                // Verify it's a completed transaction
                cy.getBySel("transaction-detail-header").should("contain", "paid");
                
                // Verify accept/reject buttons are not displayed
                cy.getBySel("transaction-accept-request").should("not.exist");
                cy.getBySel("transaction-reject-request").should("not.exist");
            });
        });
    });
});
