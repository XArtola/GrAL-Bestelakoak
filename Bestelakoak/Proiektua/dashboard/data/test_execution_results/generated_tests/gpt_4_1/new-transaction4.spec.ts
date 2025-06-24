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
    // "submits a transaction payment and verifies the deposit for the receiver"
    //
    // This test submits a payment transaction from ctx.user to ctx.contact using the first paymentTransactions entry in userInfo,
    // then verifies that the transaction appears in the receiver's (contact's) transaction feed and that the amount matches.

    cy.getBySelLike("new-transaction").click();
    cy.wait("@allUsers");

    // Step 1: Search and select the contact (receiver)
    cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
    cy.getBySelLike("user-list-item").contains(ctx.contact!.firstName).click();

    // Step 2: Fill out the payment form
    cy.getBySel("amount-input").type(userInfo.paymentTransactions[0].amount.toString());
    cy.getBySel("transaction-create-description-input").type(userInfo.paymentTransactions[0].description);

    // Step 3: Submit the payment
    cy.getBySel("transaction-create-submit-payment").click();
    cy.wait("@createTransaction");

    // Step 4: Assert success message and redirect to personal transactions
    cy.getBySel("alert-bar-success").should("contain", "Transaction Submitted!");
    cy.url().should("include", "/personal");

    // Step 5: Switch to the receiver and verify the deposit
    cy.switchUserByXstate(ctx.contact!.username);
    cy.getBySel("nav-personal-tab").click();
    cy.wait("@personalTransactions");

    // Step 6: Assert the new transaction appears in the receiver's feed with correct amount and description
    cy.getBySelLike("transaction-item")
      .should("contain", userInfo.paymentTransactions[0].description)
      .and("contain", Dinero({ amount: Number(userInfo.paymentTransactions[0].amount) * 100, currency: "USD" }).toFormat());
  });
});
