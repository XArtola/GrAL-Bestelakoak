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
    it('navigates to the new transaction form, selects a user and submits a transaction request', () => {
    // Navigate to the new transaction form

      cy.getBySelLike("new-transaction").click();

      // Wait for the users to load

      cy.wait("@allUsers");

      // Select a user from the list

      cy.getBySelLike("user-list-item").first().click();

      // Type in the amount

      cy.get("[data-test*=transaction-amount-input]").type("95");

      // Type in the description

      cy.get("[data-test*=transaction-description-input]").type("Fancy Hotel 🏨");

      // Request a transaction

      cy.getBySelLike("request-payment").click();

      // Wait for the transaction to be created

      cy.wait("@createTransaction").then(interception => {
        assert.isNotNull(interception.response?.statusCode, '1st API call has response');
        expect(interception.response?.statusCode).to.eq(200);
      });

      // Verify that the transaction was created successfully

      cy.contains("Requested").should("be.visible");
  });
});
