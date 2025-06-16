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
// <generated_code>

  // Navigate to the new transaction form

  cy.getBySel("new-transaction").click();
  cy.wait("@allUsers");

  // Select the contact user

  cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();

  // Enter request details from userInfo

  cy.getBySel("amount").type(userInfo.requestTransactions[0].amount);
  cy.getBySel("transaction-create-description-input").type(userInfo.requestTransactions[0].description);
  cy.getBySel("transaction-create-submit-request").click();
  cy.wait("@createTransaction");

  // Logout as the sender

  cy.getBySel("sidenav-signout").click();

  // Login as the receiver (contact)

  cy.loginByXstate(ctx.contact!.username);

  // Go to personal transactions

  cy.getBySel("nav-personal-tab").click();
  cy.wait("@personalTransactions");

  // Find and click on the transaction request

  cy.getBySel("transaction-item").first().should("contain", userInfo.requestTransactions[0].description).click();

  // Accept the request

  cy.getBySel("transaction-accept-request").click();
  cy.wait("@updateTransaction");

  // Verify the transaction status is updated (e.g., shows as paid or completed)

  // More information is needed on how the UI indicates an accepted request in the list.

  // For now, we'll check that the "accept" button is gone, implying it was actioned.

  cy.getBySel("transaction-accept-request").should("not.exist");
  cy.getBySel("transaction-status").should("contain", "paid"); // Assuming 'paid' is the status after acceptance

  // </generated_code>
 });
});
