import Dinero from "dinero.js";
import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";

// Transaction info from extracted-test-info.json
const paymentTransactions = [
  {
    amount: "35",
    description: "Sushi dinner 🍣"
  },
  {
    amount: 25,
    description: "Indian Food"
  }
];
const requestTransactions = [
  {
    amount: "95",
    description: "Fancy Hotel 🏨"
  },
  {
    amount: 100,
    description: "Fancy Hotel"
  }
];

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

    it("navigates to the new transaction form, selects a user and submits a transaction payment", () => {
      const payment = paymentTransactions[0];
      // Navigate to the new transaction page
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");

      // Select the contact
      cy.getBySel("user-list-item-" + ctx.contact!.id).click();

      // Enter payment details
      cy.getBySel("amount-input").type(payment.amount.toString());
      cy.getBySel("transaction-create-description-input").type(payment.description);

      // Click Pay
      cy.getBySel("transaction-create-submit-payment").click();

      // Wait for transaction creation and assert redirection/notification
      cy.wait("@createTransaction");
      cy.location("pathname").should("equal", "/");
      cy.getBySel("alert-bar-success")
        .should("be.visible")
        .and("contain", "Transaction Submitted");
    });

    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
      const request = requestTransactions[0];
      // Navigate to the new transaction page
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");

      // Select the contact
      cy.getBySel("user-list-item-" + ctx.contact!.id).click();

      // Enter request details
      cy.getBySel("amount-input").type(request.amount.toString());
      cy.getBySel("transaction-create-description-input").type(request.description);

      // Click Request
      cy.getBySel("transaction-create-submit-request").click();

      // Wait for transaction creation and assert redirection/notification
      cy.wait("@createTransaction");
      cy.location("pathname").should("equal", "/");
      cy.getBySel("alert-bar-success")
        .should("be.visible")
        .and("contain", "Transaction Submitted");
    });

    it("displays new transaction errors", () => {
      // Navigate to the new transaction page
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");

      // Select the contact
      cy.getBySel("user-list-item-" + ctx.contact!.id).click();

      // Click Pay without entering amount/description
      cy.getBySel("transaction-create-submit-payment").click();

      // Assert error messages
      cy.get("#transaction-create-amount-input-helper-text").should("contain", "Please enter a valid amount");
      cy.get("#transaction-create-description-input-helper-text").should("contain", "Please enter a note");

      // Enter invalid amount
      cy.getBySel("amount-input").type("0");
      cy.get("#transaction-create-amount-input-helper-text").should("contain", "Please enter a valid amount");
      cy.getBySel("amount-input").clear().type("-50");
      cy.get("#transaction-create-amount-input-helper-text").should("contain", "Please enter a valid amount");
    });

    it("submits a transaction payment and verifies the deposit for the receiver", () => {
      const payment = paymentTransactions[1];
      // Navigate to the new transaction page
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");

      // Select the contact
      cy.getBySel("user-list-item-" + ctx.contact!.id).click();

      // Enter payment details
      cy.getBySel("amount-input").type(payment.amount.toString());
      cy.getBySel("transaction-create-description-input").type(payment.description);

      // Click Pay
      cy.getBySel("transaction-create-submit-payment").click();
      cy.wait("@createTransaction");

      // Logout current user
      cy.logoutByXstate();

      // Login as the receiver
      cy.loginByXstate(ctx.contact!.username);

      // Go to personal transactions
      cy.getBySel("nav-personal-tab").click();
      cy.wait("@personalTransactions");

      // Assert the transaction is present in the receiver's list
      cy.getBySelLike("transaction-item")
        .first()
        .should("contain", payment.description)
        .and("contain", `+${Dinero({ amount: payment.amount * 100 }).toFormat("$0,0.00")}`);
    });

    it("submits a transaction request and accepts the request for the receiver", () => {
      const request = requestTransactions[1];
      // Navigate to the new transaction page
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");

      // Select the contact
      cy.getBySel("user-list-item-" + ctx.contact!.id).click();

      // Enter request details
      cy.getBySel("amount-input").type(request.amount.toString());
      cy.getBySel("transaction-create-description-input").type(request.description);

      // Click Request
      cy.getBySel("transaction-create-submit-request").click();
      cy.wait("@createTransaction");

      // Logout current user
      cy.logoutByXstate();

      // Login as the receiver
      cy.loginByXstate(ctx.contact!.username);

      // Go to personal transactions
      cy.getBySel("nav-personal-tab").click();
      cy.wait("@personalTransactions");

      // Find the request and accept it
      cy.getBySelLike("transaction-item")
        .first()
        .should("contain", request.description)
        .and("contain", `-${Dinero({ amount: request.amount * 100 }).toFormat("$0,0.00")}`)
        .find("[data-test*=transaction-accept-request]")
        .click();

      // Wait for the update and assert the transaction status changes
      cy.wait("@updateTransaction");
      cy.getBySelLike("transaction-item")
        .first()
        .should("contain", "paid") // Or whatever indicates acceptance
        .and("not.contain", "requested");
    });

    context("searches for a user by attribute", function () {
        const searchAttrs: (keyof User)[] = [
            "firstName",
            "lastName",
            "username",
            "email",
            "phoneNumber",
        ];
        beforeEach(function () {
            cy.getBySelLike("new-transaction").click();
            cy.wait("@allUsers");
        });
        searchAttrs.forEach((attr: keyof User) => {
            it(attr, () => {
              const searchTerm = ctx.contact![attr];
              if (!searchTerm) {
                // Skip test if the attribute is not present on the contact
                cy.log(`Skipping search for ${attr} as it's not defined for the contact.`);
                return;
              }
              // Type the search term into the search input
              cy.getBySel("user-search-input").type(searchTerm);
              cy.wait("@usersSearch");

              // Assert that only the matching contact is shown (or is the first result)
              cy.getBySelLike("user-list-item").should("have.length.at.least", 1);
              cy.getBySel("user-list-item-" + ctx.contact!.id).should("be.visible");

              // Assert other users are not visible (if applicable)
              // cy.getBySelLike("user-list-item").should("have.length", 1);

              // Clear the search for the next iteration
              cy.getBySel("user-search-input").clear();
            });
        });
    });
});
