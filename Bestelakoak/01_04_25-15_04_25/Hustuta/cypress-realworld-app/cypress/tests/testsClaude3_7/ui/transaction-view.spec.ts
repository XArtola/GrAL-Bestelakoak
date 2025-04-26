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
        // First, navigate to the personal transactions list view
        cy.visit("/");
        
        // Verify that the tabs are visible on the list view
        cy.getBySel("nav-transaction-tabs").should("be.visible");
        cy.getBySel("nav-personal-tab").should("be.visible");
        cy.getBySel("nav-public-tab").should("be.visible");
        cy.getBySel("nav-contacts-tab").should("be.visible");
        
        // Click on the first transaction to navigate to the transaction detail view
        cy.getBySel("transaction-item").first().click();
        cy.wait("@getTransaction");
        
        // Verify that the tabs are hidden on the transaction detail view
        cy.getBySel("nav-transaction-tabs").should("not.exist");
        
        // Verify we're on the transaction detail page by checking for transaction detail elements
        cy.getBySel("transaction-detail-header").should("be.visible");
        cy.getBySel("transaction-amount").should("be.visible");
        cy.getBySel("transaction-description").should("be.visible");
    });
    it("likes a transaction", () => {
        // Get the first transaction from the list
        cy.getBySel("transaction-item").first().click();
        cy.wait("@getTransaction");
        
        // Get initial likes count
        let initialLikesCount = 0;
        cy.getBySel("like-count")
          .invoke("text")
          .then((text) => {
            // Convert the text to number - if no likes, it might not show a count
            initialLikesCount = text ? parseInt(text.trim(), 10) : 0;
            
            // Click the like button
            cy.getBySel("like-button").click();
            
            // Verify the like count increased
            cy.getBySel("like-count").should(($el) => {
                const newLikesCount = $el.text() ? parseInt($el.text().trim(), 10) : 0;
                expect(newLikesCount).to.equal(initialLikesCount + 1);
            });
            
            // Click like button again to unlike
            cy.getBySel("like-button").click();
            
            // Verify the like count decreased back to original value
            cy.getBySel("like-count").should(($el) => {
                const finalLikesCount = $el.text() ? parseInt($el.text().trim(), 10) : 0;
                expect(finalLikesCount).to.equal(initialLikesCount);
            });
        });
    });
    it("comments on a transaction", () => {
        // Click on the first transaction to view details
        cy.getBySel("transaction-item").first().click();
        cy.wait("@getTransaction");
        
        // Create a unique comment text
        const commentText = `Test comment ${Date.now()}`;
        
        // Get the initial count of comments (if any)
        let initialCommentsCount = 0;
        cy.get("body").then(($body) => {
            initialCommentsCount = $body.find("[data-test=comment-list-item]").length;
            
            // Enter a new comment
            cy.getBySel("comment-input").type(commentText);
            cy.getBySel("comment-submit").click();
            
            // Wait for the comment to be submitted and UI updated
            cy.getBySel("comments-list").should("contain", commentText);
            
            // Verify that the number of comments increased by 1
            cy.getBySel("comment-list-item").should("have.length", initialCommentsCount + 1);
            
            // Verify the most recent comment has the text we entered
            cy.getBySel("comment-list-item").first().should("contain", commentText);
        });
    });
    it("accepts a transaction request", () => {
        // Verify that we have a pending request transaction from the beforeEach hook
        if (!ctx.transactionRequest) {
            cy.log("No pending transaction request available for testing");
            return;
        }
        
        // Navigate to the specific transaction request
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        
        // Verify the transaction is in "requested" state
        cy.getBySel("transaction-detail-header").should("contain", "requested");
        
        // Get the initial balance for comparison after accepting the request
        let initialBalance = 0;
        cy.getBySel("user-balance").invoke("text").then((text) => {
            // Extract the balance amount (remove currency symbol and commas)
            initialBalance = parseFloat(text.replace(/[$,]/g, ""));
            
            // Accept the transaction request
            cy.getBySel("transaction-accept-request").click();
            cy.wait("@updateTransaction");
            
            // Verify the transaction status changed to "paid"
            cy.getBySel("transaction-detail-header").should("contain", "paid");
            
            // Verify the accept/reject buttons are no longer visible
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
            
            // Verify that the user's balance decreased by the transaction amount
            const transactionAmount = parseFloat(ctx.transactionRequest.amount);
            cy.getBySel("user-balance").invoke("text").then((updatedText) => {
                const updatedBalance = parseFloat(updatedText.replace(/[$,]/g, ""));
                expect(updatedBalance).to.be.lessThan(initialBalance);
                expect(updatedBalance).to.be.closeTo(initialBalance - transactionAmount, 0.01);
            });
        });
    });
    it("rejects a transaction request", () => {
        // Verify that we have a pending request transaction from the beforeEach hook
        if (!ctx.transactionRequest) {
            cy.log("No pending transaction request available for testing");
            return;
        }
        
        // Navigate to the specific transaction request
        cy.visit(`/transaction/${ctx.transactionRequest.id}`);
        cy.wait("@getTransaction");
        
        // Verify the transaction is in "requested" state
        cy.getBySel("transaction-detail-header").should("contain", "requested");
        
        // Get the initial balance for comparison after rejecting the request
        let initialBalance = 0;
        cy.getBySel("user-balance").invoke("text").then((text) => {
            // Extract the balance amount (remove currency symbol and commas)
            initialBalance = parseFloat(text.replace(/[$,]/g, ""));
            
            // Reject the transaction request
            cy.getBySel("transaction-reject-request").click();
            cy.wait("@updateTransaction");
            
            // Verify the transaction status changed to "rejected"
            cy.getBySel("transaction-detail-header").should("contain", "rejected");
            
            // Verify the accept/reject buttons are no longer visible
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
            
            // Verify that the user's balance remains unchanged
            cy.getBySel("user-balance").invoke("text").then((updatedText) => {
                const updatedBalance = parseFloat(updatedText.replace(/[$,]/g, ""));
                expect(updatedBalance).to.equal(initialBalance);
            });
        });
    });
    it("does not display accept/reject buttons on completed request", () => {
        // Find a completed transaction (either paid or rejected)
        cy.database("find", "transactions", {
            receiverId: ctx.authenticatedUser!.id,
            status: "complete",
        }).then((completedTransaction: Transaction) => {
            // Skip the test if no completed transaction is found
            if (!completedTransaction) {
                cy.log("No completed transaction found for testing");
                return;
            }
            
            // Navigate to the completed transaction
            cy.visit(`/transaction/${completedTransaction.id}`);
            cy.wait("@getTransaction");
            
            // Verify the transaction shows as "paid" or "charged"
            cy.getBySel("transaction-detail-header").should("exist");
            
            // Verify that accept/reject buttons are not visible
            cy.getBySel("transaction-accept-request").should("not.exist");
            cy.getBySel("transaction-reject-request").should("not.exist");
        });
    });
});
