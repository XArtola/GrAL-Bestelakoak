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

    // transactions navigation tabs are hidden on a transaction view page
    it("transactions navigation tabs are hidden on a transaction view page", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-view.spec.ts
      if (!ctx.transactionRequest) {
        cy.getBySelLike("transaction-item").first().click();
      } else {
        cy.getBySelLike("transaction-item").contains(ctx.transactionRequest.description).click();
      }
      cy.getBySel("nav-personal-tab").should("not.exist");
      cy.getBySel("nav-public-tab").should("not.exist");
      cy.getBySel("nav-contacts-tab").should("not.exist");
    });

    // likes a transaction
    it("likes a transaction", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-view.spec.ts
      if (!ctx.transactionRequest) {
        cy.getBySelLike("transaction-item").first().click();
      } else {
        cy.getBySelLike("transaction-item").contains(ctx.transactionRequest.description).click();
      }
      cy.getBySel("transaction-like-button").click();
      cy.getBySel("transaction-like-count").should("contain", "1");
    });

    // comments on a transaction
    it("comments on a transaction", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-view.spec.ts
      const comment = "Test comment";
      if (!ctx.transactionRequest) {
        cy.getBySelLike("transaction-item").first().click();
      } else {
        cy.getBySelLike("transaction-item").contains(ctx.transactionRequest.description).click();
      }
      cy.getBySel("transaction-comment-input").type(comment);
      cy.getBySel("transaction-comment-submit").click();
      cy.getBySel("transaction-comment-list").should("contain", comment);
    });

    // accepts a transaction request
    it("accepts a transaction request", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-view.spec.ts
      if (ctx.transactionRequest) {
        cy.getBySelLike("transaction-item").contains(ctx.transactionRequest.description).click();
        cy.getBySel("transaction-accept-request").click();
        cy.wait("@updateTransaction").then((interception) => {
          expect(interception.response.statusCode).to.eq(200);
          cy.getBySel("transaction-status").should("contain", "Complete");
        });
      } else {
        cy.log("No transaction request found for this user.");
      }
    });

    // rejects a transaction request
    it("rejects a transaction request", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-view.spec.ts
      if (ctx.transactionRequest) {
        cy.getBySelLike("transaction-item").contains(ctx.transactionRequest.description).click();
        cy.getBySel("transaction-reject-request").click();
        cy.wait("@updateTransaction").then((interception) => {
          expect(interception.response.statusCode).to.eq(200);
        });
      } else {
        cy.log("No transaction request found for this user.");
      }
    });

    // does not display accept/reject buttons on completed request
    it("does not display accept/reject buttons on completed request", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-view.spec.ts
      cy.database("find", "transactions", {
        receiverId: ctx.authenticatedUser.id,
        status: "complete",
        requestStatus: "accepted",
      }).then((transaction: Transaction) => {
        if (transaction) {
          cy.getBySelLike("transaction-item").contains(transaction.description).click();
          cy.getBySel("transaction-accept-request").should("not.exist");
          cy.getBySel("transaction-reject-request").should("not.exist");
        } else {
          cy.log("No completed transaction request found for this user.");
        }
      });
    });
});
