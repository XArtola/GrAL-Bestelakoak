import { User, Transaction } from "../../../../src/models";
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
    it("transactions navigation tabs are hidden on a transaction view page", () => { });
    it("likes a transaction", () => { });
    it("comments on a transaction", () => { });
    it("accepts a transaction request", () => { });
    it("rejects a transaction request", () => { });
    it("does not display accept/reject buttons on completed request", () => { });
});

describe("Transaction View", () => {
    beforeEach(() => {
        cy.task("db:seed");
        cy.intercept("GET", "/transactions/*").as("getTransaction");
        cy.intercept("GET", "/users/*").as("getUser");
        cy.intercept("POST", "/comments/*").as("postComment");
        cy.intercept("POST", "/likes/*").as("postLike");
        cy.loginByXstate(Cypress.env("USER_USERNAME"), Cypress.env("USER_PASSWORD"));
        
        // Get a test transaction
        cy.database("find", "transactions").then((transaction: Transaction) => {
            cy.wrap(transaction).as("testTransaction");
        });
    });

    it("displays transaction details", () => {
        cy.get("@testTransaction").then((subject) => {
            const transaction = subject as unknown as Transaction;
            cy.visit(`/transaction/${transaction.id}`);
            cy.wait("@getTransaction");
            
            cy.get("[data-test='transaction-sender']").should("be.visible");
            cy.get("[data-test='transaction-receiver']").should("be.visible");
            cy.get("[data-test='transaction-amount']").should("be.visible");
            cy.get("[data-test='transaction-description']").should("be.visible");
        });
    });

    it("allows commenting on a transaction", () => {
        cy.get<Transaction>("@testTransaction").then((transaction: Transaction) => {
            cy.visit(`/transaction/${transaction.id}`);
            cy.wait("@getTransaction");

            // Add a comment
            const comment = "Great transaction!";
            cy.get("[data-test='transaction-comment-input']").type(comment);
            cy.get("[data-test='transaction-comment-submit']").click();

            // Verify comment appears
            cy.wait("@postComment");
            cy.get("[data-test='transaction-comment-list']")
                .should("contain", comment);
        });
    });

    it("allows liking a transaction", () => {
        cy.get<Transaction>("@testTransaction").then((transaction: Transaction) => {
            cy.visit(`/transaction/${transaction.id}`);
            cy.wait("@getTransaction");

            // Like the transaction
            cy.get("[data-test='transaction-like-button']").click();
            cy.wait("@postLike");

            // Verify like is registered
            cy.get("[data-test='transaction-like-count']")
                .should("not.equal", "0");
        });
    });

    it("shows transaction status", () => {
        cy.get<Transaction>("@testTransaction").then((transaction: Transaction) => {
            cy.visit(`/transaction/${transaction.id}`);
            cy.wait("@getTransaction");

            // Verify status is visible
            cy.get("[data-test='transaction-status']").should("be.visible");
        });
    });

    it("displays empty state for nonexistent transaction", () => {
        // Visit nonexistent transaction
        cy.visit("/transaction/nonexistent-id");
        cy.wait("@getTransaction");

        // Verify empty state
        cy.get("[data-test='empty-transaction-view']").should("be.visible");
    });

    it("shows transaction date in correct format", () => {
        cy.get<Transaction>("@testTransaction").then((transaction: Transaction) => {
            cy.visit(`/transaction/${transaction.id}`);
            cy.wait("@getTransaction");

            // Verify date format
            cy.get("[data-test='transaction-date']")
                .invoke("text")
                .should("match", /\w+ \d{1,2}, \d{4}/);
        });
    });
});
