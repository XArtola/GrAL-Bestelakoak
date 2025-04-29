import { User, Transaction } from "../../../src/models";
import Dinero from "dinero.js";

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
    cy.intercept("POST", "/likes/*").as("postLike");
    cy.intercept("POST", "/comments/*").as("postComment");

    cy.database("find", "users").then((user: User) => {
      ctx.authenticatedUser = user;
      cy.loginByXstate(ctx.authenticatedUser.username);

      // Find a pending request for the logged-in user to accept/reject
      cy.database("find", "transactions", {
        receiverId: ctx.authenticatedUser.id,
        status: "pending",
        requestStatus: "pending",
      }).then((transaction: Transaction) => {
        ctx.transactionRequest = transaction;
      });
    });

    // Navigate to personal feed initially
    cy.getBySel("nav-personal-tab").click();
    cy.wait("@personalTransactions");
  });

  it("transactions navigation tabs are hidden on a transaction view page", () => {
    // Click on the first transaction item in the list
    cy.getBySelLike("transaction-item").first().click();
    // Wait for the transaction details to load
    cy.wait("@getTransaction");
    // Assert that the tab navigation is not present
    cy.getBySel("transaction-detail-tab-navigation").should("not.exist"); // Assuming this selector targets the tabs
    cy.getBySel("nav-personal-tab").should("not.exist");
    cy.getBySel("nav-contacts-tab").should("not.exist");
    cy.getBySel("nav-public-tab").should("not.exist");
  });

  it("likes a transaction", () => {
    // Click on the first transaction item
    cy.getBySelLike("transaction-item").first().click();
    cy.wait("@getTransaction");
    // Click the like button
    cy.getBySelLike("like-button").click();
    // Wait for the like request to complete
    cy.wait("@postLike");
    // Assert the like count increases to 1
    cy.getBySelLike("like-count").should("contain", 1);
    // Optional: Click again to unlike and assert count decreases (if unlike is implemented)
    // cy.getBySelLike("like-button").click();
    // cy.wait("@deleteLike"); // Assuming a DELETE request for unlike
    // cy.getBySelLike("like-count").should("contain", 0);
  });

  it("comments on a transaction", () => {
    const commentText = "This is a test comment!";
    // Click on the first transaction item
    cy.getBySelLike("transaction-item").first().click();
    cy.wait("@getTransaction");
    // Type a comment and press enter
    cy.getBySel("comment-input").type(`${commentText}{enter}`);
    // Wait for the comment request to complete
    cy.wait("@postComment");
    // Assert the comment appears in the comment list
    cy.getBySelLike("comment-list-item").should("contain", commentText);
  });

  it("accepts a transaction request", () => {
    // Ensure a pending request exists for the user
    expect(ctx.transactionRequest).to.exist;
    // Visit the specific transaction request page
    cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
    cy.wait("@getTransaction");
    // Assert the header shows "requested" and the correct amount
    cy.getBySel("transaction-detail-header").should(
      "contain",
      `requested ${Dinero({ amount: ctx.transactionRequest!.amount }).toFormat("$0,0.00")}`
    );
    // Click the accept button
    cy.getBySelLike("accept-request").click();
    // Wait for the transaction update request
    cy.wait("@updateTransaction");
    // Assert the header now shows "paid" and the correct amount
    cy.getBySel("transaction-detail-header").should(
      "contain",
      `paid ${Dinero({ amount: ctx.transactionRequest!.amount }).toFormat("$0,0.00")}`
    );
    // Assert accept and reject buttons are no longer visible
    cy.getBySelLike("accept-request").should("not.exist");
    cy.getBySelLike("reject-request").should("not.exist");
  });

  it("rejects a transaction request", () => {
    // Ensure a pending request exists for the user
    expect(ctx.transactionRequest).to.exist;
    // Visit the specific transaction request page
    cy.visit(`/transaction/${ctx.transactionRequest!.id}`);
    cy.wait("@getTransaction");
    // Assert the header shows "requested" and the correct amount
    cy.getBySel("transaction-detail-header").should(
      "contain",
      `requested ${Dinero({ amount: ctx.transactionRequest!.amount }).toFormat("$0,0.00")}`
    );
    // Click the reject button
    cy.getBySelLike("reject-request").click();
    // Wait for the transaction update request
    cy.wait("@updateTransaction");
    // Assert the header now shows "rejected" and the correct amount
    cy.getBySel("transaction-detail-header").should(
      "contain",
      `rejected ${Dinero({ amount: ctx.transactionRequest!.amount }).toFormat("$0,0.00")}`
    );
    // Assert accept and reject buttons are no longer visible
    cy.getBySelLike("accept-request").should("not.exist");
    cy.getBySelLike("reject-request").should("not.exist");
  });

  it("does not display accept/reject buttons on completed request", () => {
    // Find a completed (accepted or rejected) request involving the user
    cy.database("find", "transactions", {
      $or: [{ receiverId: ctx.authenticatedUser!.id }, { senderId: ctx.authenticatedUser!.id }],
      status: "complete",
      requestStatus: { $ne: null, $ne: "pending" }, // Find accepted or rejected
    }).then((transaction: Transaction) => {
      // Visit the transaction detail page
      cy.visit(`/transaction/${transaction.id}`);
      cy.wait("@getTransaction");
      // Assert accept and reject buttons do not exist
      cy.getBySelLike("accept-request").should("not.exist");
      cy.getBySelLike("reject-request").should("not.exist");
    });
  });
});
