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
    // Navigate to new transaction

      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");

      // Select a contact

      cy.getBySelLike("user-list-item").first().click();

      // Enter amount and description

      const amount = "35";
      const description = "Sushi dinner 🍣";
      cy.get("#amount").type(amount);
      cy.get("#description").type(description);

      // Submit payment

      cy.getBySelLike("payment-submit-button").click();
      cy.wait("@createTransaction").then(interception => {
        assert.isNotNull(interception?.response?.statusCode, "POST transactions must have a status code");
        expect(interception?.response?.statusCode).to.equal(200);
      });

      // Verify the transaction

      cy.wait("@personalTransactions");
      cy.getBySel("transaction-list").should("be.visible");
  });
});
