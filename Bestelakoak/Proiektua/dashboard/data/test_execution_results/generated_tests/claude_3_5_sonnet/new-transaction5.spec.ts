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
// First create a request

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Search for contact by name

  cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
  cy.wait("@usersSearch");

  // Select the first user from the search results

  cy.getBySel("user-list-item").first().click();

  // Enter request details using the first request transaction

  cy.getBySel("amount-input").type("95");
  cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");

  // Submit request

  cy.getBySelLike("transaction-create-submit-request").click();
  cy.wait("@createTransaction");

  // Verify request was created successfully

  cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Transaction Submitted!");

  // Logout and login as the contact (receiver of request)

  cy.switchUserByXstate(ctx.contact!.username);

  // Go to personal transactions

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Find and click on the transaction request

  cy.getBySel("transaction-item").first().should("contain", "Fancy Hotel 🏨").should("contain", "$95").click();

  // Accept the request

  cy.getBySel("transaction-accept-request").click();
  cy.wait("@updateTransaction");

  // Verify the transaction status is updated

  cy.getBySel("transaction-detail-header").should("contain", "completed");
 });
});
