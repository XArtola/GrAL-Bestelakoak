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
    it('submits a transaction request and accepts the request for the receiver', () => {
    // it("submits a transaction request and accepts the request for the receiver", () => { ... })

    // 1. Navigate to the new transaction form and select a contact to request money from
    cy.getBySelLike("new-transaction").click();
    cy.wait("@allUsers");

    // 2. Search and select the contact (receiver)
    cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
    cy.getBySelLike("user-list-item").contains(ctx.contact!.firstName).click();

    // 3. Fill out the transaction request form with provided userInfo.requestTransactions[0]
    cy.getBySel("transaction-create-amount-input").type("95");
    cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");

    // 4. Submit the request
    cy.getBySel("transaction-create-submit-request").click();
    cy.wait("@createTransaction");

    // 5. Assert that the request was submitted and confirmation is shown
    cy.getBySel("alert-bar-success").should("contain", "requested");

    // 6. Log out and log in as the contact (receiver)
    cy.logoutByXstate();
    cy.loginByXstate(ctx.contact!.username);

    // 7. Go to personal transactions and find the pending request
    cy.getBySel("nav-personal-tab").click();
    cy.wait("@personalTransactions");
    cy.getBySelLike("transaction-item")
      .contains("Fancy Hotel 🏨")
      .parents("[data-test^=transaction-item]")
      .as("pendingRequest");

    // 8. Open the transaction details
    cy.get("@pendingRequest").click();
    cy.wait("@getTransaction");

    // 9. Accept the request
    cy.getBySel("transaction-accept-request").click();
    cy.wait("@updateTransaction");

    // 10. Assert that the transaction status is updated and confirmation is shown
    cy.getBySel("alert-bar-success").should("contain", "accepted");
    cy.getBySel("transaction-detail-status").should("contain", "accepted");
  });
});
