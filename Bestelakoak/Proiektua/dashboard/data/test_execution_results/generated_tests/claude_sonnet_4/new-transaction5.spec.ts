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
    it("submits a transaction request and accepts the request for the receiver", () => {
const requestTransaction = {
    amount: "95",
    description: "Fancy Hotel 🏨"
  };

  // Navigate to new transaction form

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Search for and select the contact user

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");
  cy.getBySel("user-list-item").first().click();

  // Fill in the request details

  cy.getBySel("amount-input").type(requestTransaction.amount);
  cy.getBySel("transaction-create-description-input").type(requestTransaction.description);

  // Submit the request (not payment)

  cy.getBySel("transaction-create-submit-request").click();
  cy.wait("@createTransaction");

  // Verify request was created successfully

  cy.getBySel("alert-bar-success").should("be.visible");

  // Switch to the receiver's account (contact user)

  cy.switchUserByXstate(ctx.contact!.username);

  // Navigate to personal transactions to see the request

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Find and click on the transaction request

  cy.getBySel("transaction-item").first().should("contain", requestTransaction.description).should("contain", `$${requestTransaction.amount}`).click();

  // Accept the request

  cy.getBySel("transaction-accept-request").click();
  cy.wait("@updateTransaction");

  // Verify the transaction was accepted

  cy.getBySel("alert-bar-success").should("be.visible");

  // Verify the transaction status is updated to completed/accepted

  cy.getBySel("transaction-item").first().should("contain", "paid").or("contain", "completed");
 });
});
