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
        // Click on the first transaction in the personal feed
        cy.getBySel("transaction-item")
            .first()
            .click();
        
        // Wait for transaction details to load
        cy.wait("@getTransaction");
        
        // Verify that the navigation tabs are not visible
        cy.getBySel("nav-public-tab").should("not.exist");
        cy.getBySel("nav-contacts-tab").should("not.exist");
        cy.getBySel("nav-personal-tab").should("not.exist");
        
        // Verify we are on the transaction detail view
        cy.getBySel("transaction-detail").should("be.visible");
    });
    it("likes a transaction", () => {
        // Click on the first transaction in the personal feed
        cy.getBySel("transaction-item")
            .first()
            .click();
        
        // Wait for transaction details to load
        cy.wait("@getTransaction");
        
        // Get initial like count
        cy.getBySel("transaction-like-count")
            .invoke("text")
            .then((text) => {
                const initialLikeCount = parseInt(text || "0");
                
                // Click the like button
                cy.getBySel("transaction-like-button").click();
                
                // Verify like count increased by 1
                cy.getBySel("transaction-like-count")
                    .should("have.text", (initialLikeCount + 1).toString());
            });
    });
    it("comments on a transaction", () => {
        // Click on the first transaction in the personal feed
        cy.getBySel("transaction-item")
            .first()
            .click();
        
        // Wait for transaction details to load
        cy.wait("@getTransaction");
        
        // Type a comment
        const comment = "This is a test comment";
        cy.getBySel("transaction-comment-input")
            .type(comment);
        
        // Submit the comment
        cy.getBySel("transaction-comment-submit").click();
        
        // Verify the comment appears in the list
        cy.getBySel("comments-list")
            .should("contain", comment);
    });
    it("accepts a transaction request", () => {
        // Navigate to the pending transaction request
        cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
        
        // Wait for transaction details to load
        cy.wait("@getTransaction");
        
        // Verify the transaction is a request and pending
        cy.getBySel("transaction-accept-request").should("be.visible");
        cy.getBySel("transaction-reject-request").should("be.visible");
        
        // Accept the request
        cy.getBySel("transaction-accept-request").click();
        
        // Wait for the transaction to be updated
        cy.wait("@updateTransaction");
        
        // Verify the transaction is now complete
        cy.getBySel("transaction-accept-request").should("not.exist");
        cy.getBySel("transaction-reject-request").should("not.exist");
        cy.getBySel("transaction-payment-status")
            .should("contain", "Complete");
    });
    it("rejects a transaction request", () => {
        // Find a pending transaction request and navigate to it
        cy.database("find", "transactions", {
            receiverId: ctx.authenticatedUser!.id,
            status: "pending",
            requestStatus: "pending",
            requestResolvedAt: ""
        }).then((transaction) => {
            // Navigate to the transaction
            cy.visit(`/transaction/${transaction.id}`);
            
            // Wait for transaction details to load
            cy.wait("@getTransaction");
            
            // Verify the transaction is a request and pending
            cy.getBySel("transaction-accept-request").should("be.visible");
            cy.getBySel("transaction-reject-request").should("be.visible");
            
            // Reject the request
            cy.getBySel("transaction-reject-request").click();
            
            // Wait for the transaction to be updated
            cy.wait("@updateTransaction");
            
            // Verify the transaction is now rejected
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
            cy.getBySel("transaction-payment-status")
                .should("contain", "Rejected");
        });
    });
    it("does not display accept/reject buttons on completed request", () => {
        // Find a completed transaction
        cy.database("find", "transactions", {
            receiverId: ctx.authenticatedUser!.id,
            status: "complete"
        }).then((transaction) => {
            // Navigate to the transaction
            cy.visit(`/transaction/${transaction.id}`);
            
            // Wait for transaction details to load
            cy.wait("@getTransaction");
            
            // Verify the accept/reject buttons are not visible
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
            
            // Verify the status shows complete
            cy.getBySel("transaction-payment-status")
                .should("contain", "Complete");
        });
    });
});
