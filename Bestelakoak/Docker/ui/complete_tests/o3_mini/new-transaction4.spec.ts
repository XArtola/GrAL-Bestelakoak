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
    it('submits a transaction payment and verifies the deposit for the receiver', () => {
    // it("submits a transaction payment and verifies the deposit for the receiver", () => { 
      // Use the first payment transaction from the provided userInfo data
      // Assume that the transaction form has fields with data-test attributes:
      //   - "transaction-amount" for the amount input
      //   - "transaction-description" for the description input
      //   - "transaction-type" for selecting the transaction type (“payment”)
      //   - "transaction-receiver" for selecting the receiver (our ctx.contact)
      //   - "submit-transaction" for the submit button
  
      // Log the start of the payment submission process
      cy.log("Submitting transaction payment");

      // Retrieve the payment details from the provided userInfo data
      const payment = userInfo.paymentTransactions[0]; // { amount: "35", description: "Sushi dinner 🍣" }

      // Fill in the transaction form with the payment data
      cy.get('[data-test="transaction-amount"]')
        .clear()
        .type(payment.amount);
      cy.get('[data-test="transaction-description"]')
        .clear()
        .type(payment.description);
      cy.get('[data-test="transaction-type"]')
        .select("payment");

      // Select the receiver (ctx.contact) from a dropdown or list
      // We assume that the receiver's username is shown as an option
      cy.get('[data-test="transaction-receiver"]').click();
      cy.contains(ctx.contact.username).click();

      // Submit the transaction payment
      cy.get('[data-test="submit-transaction"]').click();

      // Wait for the transaction creation API call to complete and assert its status
      cy.wait("@createTransaction").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
      });

      // Wait for the personal transactions to update so that the new transaction appears
      cy.wait("@personalTransactions");

      // Verify that the receiver has received a deposit for the payment
      // For example, query the backend (via cy.database) to ensure a transaction exists with the receiver's id and matching amount
      cy.database("find", "transactions").then((transactions) => {
        const newTransaction = transactions.find(
          (t) => t.receiverId === ctx.contact.id && Number(t.amount) === Number(payment.amount)
        );
        expect(newTransaction, "New payment transaction for receiver exists").to.exist;
      });

      // Optionally, verify the UI display of the receiver's updated balance
      cy.get('[data-test="receiver-balance"]')
        .invoke('text')
        .then((balanceText) => {
          const balance = parseFloat(balanceText);
          // Assert that the balance is a number greater than 0 (assumes deposit increased the balance)
          expect(balance, "Receiver balance should be increased").to.be.greaterThan(0);
        });
    // });
  });
});
