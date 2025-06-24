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

  it("submits a transaction payment and verifies the deposit for the receiver", function () {
    cy.getBySel("nav-top-new-transaction").click();

    const transactionPayload = {
      transactionType: "payment",
      amount: 25,
      description: "Indian Food",
      sender: ctx.user,
      receiver: ctx.contact,
    };

    // first let's grab the current balance from the UI
    let startBalance: string;
    if (!isMobile()) {
      // only check the balance display in desktop resolution
      // as it is NOT shown on mobile screen
      cy.get("[data-test=sidenav-user-balance]")
        .invoke("text")
        .then((x) => {
          startBalance = x; // something like "$1,484.81"
          expect(startBalance).to.match(/\$\d/);
        });
    }

    cy.createTransaction(transactionPayload);
    cy.wait("@createTransaction");
    cy.getBySel("new-transaction-create-another-transaction").should("be.visible");

    if (!isMobile()) {
      // make sure the new balance is displayed
      cy.get("[data-test=sidenav-user-balance]").should(($el) => {
        // here we only make sure the text has changed
        // we could also convert the balance to actual number
        // and confirm the new balance is the start balance - amount
        expect($el.text()).to.not.equal(startBalance);
      });
    }
    cy.visualSnapshot("Transaction Payment Submitted Notification");

    cy.switchUserByXstate(ctx.contact!.username);

    const updatedAccountBalance = Dinero({
      amount: ctx.contact!.balance + transactionPayload.amount * 100,
    }).toFormat();

    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }

    cy.getBySelLike("user-balance").should("contain", updatedAccountBalance);
    cy.visualSnapshot("Verify Updated Sender Account Balance");
  });
});
