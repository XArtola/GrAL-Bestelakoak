import Dinero from "dinero.js";
import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";

type NewTransactionTestCtx = {
  allUsers?: User[];
  user?: User;
  contact?: User;
};

describe("New Transaction", function () {
  const ctx: NewTransactionTestCtx = {};

  beforeEach(function () {
    cy.task("db:seed");

    cy.intercept("GET", "/users*").as("allUsers");

    cy.intercept("GET", "/users/search*").as("usersSearch");

    cy.intercept("POST", "/transactions").as("createTransaction");

    cy.intercept("GET", "/notifications").as("notifications");
    cy.intercept("GET", "/transactions/public").as("publicTransactions");
    cy.intercept("GET", "/transactions").as("personalTransactions");
    cy.intercept("PATCH", "/transactions/*").as("updateTransaction");

    cy.database("filter", "users").then((users: User[]) => {
      ctx.allUsers = users;
      ctx.user = users[0];
      ctx.contact = users[1];

      return cy.loginByXstate(ctx.user.username);
    });
  });

  it("submits a transaction request and accepts the request for the receiver", function () {
    const transactionPayload = {
      transactionType: "request",
      amount: 100,
      description: "Fancy Hotel",
      sender: ctx.user,
      receiver: ctx.contact,
    };

    cy.getBySelLike("new-transaction").click();
    cy.createTransaction(transactionPayload);
    cy.wait("@createTransaction");
    cy.getBySel("new-transaction-create-another-transaction").should("be.visible");
    cy.visualSnapshot("receiver - Transaction Payment Submitted Notification");

    cy.switchUserByXstate(ctx.contact!.username);

    cy.getBySelLike("personal-tab").click();

    cy.wait("@personalTransactions");

    cy.getBySelLike("transaction-item")
      .first()
      .should("contain", transactionPayload.description)
      .click({ force: true });
    cy.getBySel("transaction-detail-header").should("exist");
    cy.visualSnapshot("Navigate to Transaction Item");

    cy.getBySelLike("accept-request").click();
    cy.wait("@updateTransaction").its("response.statusCode").should("eq", 204);
    cy.getBySelLike("transaction-detail-header").should("be.visible");
    cy.getBySelLike("transaction-amount").should("be.visible");
    cy.getBySelLike("sender-avatar").should("be.visible");
    cy.getBySelLike("receiver-avatar").should("be.visible");
    cy.getBySelLike("transaction-description").should("be.visible");
    cy.visualSnapshot("Accept Transaction Request");

    cy.switchUserByXstate(ctx.user!.username);

    const updatedAccountBalance = Dinero({
      amount: ctx.user!.balance + transactionPayload.amount * 100,
    }).toFormat();

    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }

    cy.getBySelLike("user-balance").should("contain", updatedAccountBalance);
    cy.visualSnapshot("Verify Updated Sender Account Balance");
  });
});
