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

  it("transactions navigation tabs are hidden on a transaction view page", function() {});

  it("likes a transaction", function() {});

  it("comments on a transaction", function() {});

    cy.getBySelLike("comments-list").children().should("have.length", comments.length);
    cy.visualSnapshot("Comment on Transaction");
  });

  it("accepts a transaction request", function() {});

  it("rejects a transaction request", function() {});

  it("does not display accept/reject buttons on completed request", function() {}).then((transactionRequest) => {
      cy.visit(`/transaction/${transactionRequest!.id}`);

      cy.wait("@getNotifications");
      cy.getBySel("nav-top-notifications-count").should("be.visible");
      cy.getBySel("transaction-detail-header").should("be.visible");
      cy.getBySel("transaction-accept-request").should("not.exist");
      cy.getBySel("transaction-reject-request").should("not.exist");
      cy.getBySel("transaction-detail-header").should("be.visible");
      cy.visualSnapshot("Transaction Completed (not able to accept or reject)");
    });
  });
});
