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
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
// Get payment transaction data from user info

  const paymentAmount = "35";
  const paymentDescription = "Sushi dinner 🍣";

  // Store receiver's initial balance

  let receiverInitialBalance;
  cy.database("find", "users", {
    id: ctx.contact!.id
  }).then(user => {
    receiverInitialBalance = user.balance;
  });

  // Store sender's initial balance

  let senderInitialBalance;
  cy.getBySel("sidenav-user-balance").then($balance => {
    const balanceText = $balance.text().replace(/[^0-9.-]+/g, "");
    senderInitialBalance = parseFloat(balanceText);
  });

  // Navigate to new transaction form

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Search for contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the contact user

  cy.getBySel("user-list-item").first().click();

  // Enter payment amount and description

  cy.getBySel("amount-input").type(paymentAmount);
  cy.getBySel("transaction-create-description-input").type(paymentDescription);

  // Submit payment

  cy.getBySel("transaction-create-submit-payment").click();
  cy.wait("@createTransaction");

  // Verify payment was successful

  cy.getBySel("transaction-item").first().should("contain", paymentDescription);

  // Verify sender's balance decreased

  cy.getBySel("sidenav-user-balance").then($balance => {
    const balanceText = $balance.text().replace(/[^0-9.-]+/g, "");
    const currentBalance = parseFloat(balanceText);
    expect(currentBalance).to.be.lessThan(senderInitialBalance);
  });

  // Log out and log in as receiver

  cy.switchUserByXstate(ctx.contact!.username);

  // Go to personal transactions tab

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Verify transaction appears in receiver's list

  cy.getBySel("transaction-item").first().should("contain", paymentDescription).and("contain", `$${paymentAmount}`).and("contain", "received");

  // Verify receiver's balance increased

  cy.getBySel("sidenav-user-balance").then($balance => {
    const balanceText = $balance.text().replace(/[^0-9.-]+/g, "");
    const currentBalance = parseFloat(balanceText);
    const expectedBalance = receiverInitialBalance / 100 + parseFloat(paymentAmount);
    expect(currentBalance).to.be.at.least(expectedBalance);
  });
 });
});
