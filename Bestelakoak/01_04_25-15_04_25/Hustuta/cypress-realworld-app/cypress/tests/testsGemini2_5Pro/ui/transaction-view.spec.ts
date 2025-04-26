import { User, Transaction } from "../../../src/models";
import { isMobile } from "../../support/utils"; // Import isMobile

type NewTransactionCtx = {
    transactionRequest?: Transaction;
    completedTransaction?: Transaction; // Add for completed transaction test
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
        cy.intercept("POST", "/likes/*").as("postLike"); // Add intercept for likes
        cy.intercept("POST", "/comments/*").as("postComment"); // Add intercept for comments
        cy.intercept("GET", "/checkAuth").as("userProfile");
        cy.intercept("GET", "/notifications").as("getNotifications");
        cy.intercept("GET", "/bankAccounts").as("getBankAccounts");

        cy.database("find", "users").then((user: User) => {
            ctx.authenticatedUser = user;
            cy.loginByXstate(ctx.authenticatedUser.username);

            // Find a pending request for the logged-in user
            cy.database("find", "transactions", {
                receiverId: ctx.authenticatedUser.id,
                status: "pending",
                requestStatus: "pending",
            }).then((transaction: Transaction) => {
                ctx.transactionRequest = transaction;
            });

            // Find a completed transaction for the logged-in user
            cy.database("find", "transactions", {
              participants: ctx.authenticatedUser.id, // User is either sender or receiver
              status: "complete",
            }).then((transaction: Transaction) => {
              ctx.completedTransaction = transaction;
            });
        });

        // Navigate to personal feed initially
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
    });

    it("transactions navigation tabs are hidden on a transaction view page", () => {
      // Click on the first transaction in the list
      cy.getBySelLike("transaction-item").first().click();
      cy.wait("@getTransaction");

      // Assert navigation tabs are not visible
      cy.getBySel("nav-public-tab").should("not.exist");
      cy.getBySel("nav-contacts-tab").should("not.exist");
      cy.getBySel("nav-personal-tab").should("not.exist");
    });

    it("likes a transaction", () => {
      // Use the completed transaction found in beforeEach
      if (!ctx.completedTransaction) {
        throw new Error("Completed transaction not found for test");
      }
      cy.visit(`/transaction/${ctx.completedTransaction.id}`);
      cy.wait("@getTransaction");

      // Click the like button
      cy.getBySelLike("transaction-like-button").click();
      cy.wait("@postLike");

      // Assert the like count increases (or button state changes)
      cy.getBySelLike("transaction-like-count").should("contain", "1");
      // Optionally check button state if it changes
      // cy.getBySelLike("transaction-like-button").should('be.disabled'); // Or have a different style
    });

    it("comments on a transaction", () => {
      const commentText = "This is a test comment!";
      // Use the completed transaction found in beforeEach
      if (!ctx.completedTransaction) {
        throw new Error("Completed transaction not found for test");
      }
      cy.visit(`/transaction/${ctx.completedTransaction.id}`);
      cy.wait("@getTransaction");

      // Type and submit a comment
      cy.getBySel("transaction-comment-input").type(commentText + "{enter}");
      cy.wait("@postComment");

      // Assert the comment appears in the list
      cy.getBySelLike("comment-list-item").should("contain", commentText);
    });

    it("accepts a transaction request", () => {
      // Ensure a transaction request exists
      if (!ctx.transactionRequest) {
        throw new Error("Transaction request not found for test");
      }

      // Navigate directly to the transaction request view
      cy.visit(`/transaction/${ctx.transactionRequest.id}`);
      cy.wait("@getTransaction");

      // Click the accept button
      cy.getBySel("transaction-accept-request").click();
      cy.wait("@updateTransaction");

      // Assert the transaction status changes (buttons disappear, status text changes, etc.)
      cy.getBySel("transaction-accept-request").should("not.exist");
      cy.getBySel("transaction-reject-request").should("not.exist");
      cy.contains("[data-test=transaction-detail-header]", "accepted", { matchCase: false }); // Or check for specific status element
    });

    it("rejects a transaction request", () => {
      // Ensure a transaction request exists
      if (!ctx.transactionRequest) {
        throw new Error("Transaction request not found for test");
      }

      // Navigate directly to the transaction request view
      cy.visit(`/transaction/${ctx.transactionRequest.id}`);
      cy.wait("@getTransaction");

      // Click the reject button
      cy.getBySel("transaction-reject-request").click();
      cy.wait("@updateTransaction");

      // Assert the transaction status changes
      cy.getBySel("transaction-accept-request").should("not.exist");
      cy.getBySel("transaction-reject-request").should("not.exist");
      cy.contains("[data-test=transaction-detail-header]", "rejected", { matchCase: false }); // Or check for specific status element
    });

    it("does not display accept/reject buttons on completed request", () => {
      // Use the completed transaction found in beforeEach
      if (!ctx.completedTransaction) {
        throw new Error("Completed transaction not found for test");
      }
      cy.visit(`/transaction/${ctx.completedTransaction.id}`);
      cy.wait("@getTransaction");

      // Assert accept and reject buttons do not exist
      cy.getBySel("transaction-accept-request").should("not.exist");
      cy.getBySel("transaction-reject-request").should("not.exist");
    });
});
