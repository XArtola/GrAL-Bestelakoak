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
    it("navigates to the new transaction form, selects a user and submits a transaction payment", () => {
        // Navigate to new transaction form and fill in payment transaction details using the first payment object.
        cy.getBySel("new-transaction-button").click();
        cy.getBySel("user-search-input").type("Contact Name");
        cy.getBySel("user-search-result").first().click();
        cy.getBySel("transaction-amount-input").clear().type("35");
        cy.getBySel("transaction-description-input").clear().type("Sushi dinner 🍣");
        cy.getBySel("transaction-type-selector").select("Payment");
        cy.getBySel("submit-transaction").click();
        cy.wait("@createTransaction");
        cy.getBySel("success-message").should("contain", "Transaction submitted");
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // Navigate to the transaction form for a request using the first request object.
        cy.getBySel("new-transaction-button").click();
        cy.getBySel("user-search-input").type("Contact Name");
        cy.getBySel("user-search-result").first().click();
        cy.getBySel("transaction-amount-input").clear().type("95");
        cy.getBySel("transaction-description-input").clear().type("Fancy Hotel 🏨");
        cy.getBySel("transaction-type-selector").select("Request");
        cy.getBySel("submit-transaction").click();
        cy.wait("@createTransaction");
        cy.getBySel("success-message").should("contain", "Transaction request submitted");
    });
    it("displays new transaction errors", () => {
        // Submit new transaction form with empty inputs to trigger validation errors.
        cy.getBySel("new-transaction-button").click();
        cy.getBySel("transaction-amount-input").clear();
        cy.getBySel("transaction-description-input").clear();
        cy.get("form[data-test='new-transaction-form']").submit();
        cy.getBySel("error-message").should("contain", "Amount is required");
        cy.getBySel("error-message").should("contain", "Description is required");
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // Perform a payment transaction with the second payment object details.
        cy.getBySel("new-transaction-button").click();
        cy.getBySel("user-search-input").type("Contact Name");
        cy.getBySel("user-search-result").first().click();
        cy.getBySel("transaction-amount-input").clear().type("25");
        cy.getBySel("transaction-description-input").clear().type("Indian Food");
        cy.getBySel("transaction-type-selector").select("Payment");
        cy.getBySel("submit-transaction").click();
        cy.wait("@createTransaction");
        // Assert that the receiver’s balance updated (actual balance text expected should be defined)
        cy.getBySel("receiver-balance").should("contain", "Updated Balance");
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        // Submit a request transaction using the second request transaction details.
        cy.getBySel("new-transaction-button").click();
        cy.getBySel("user-search-input").type("Contact Name");
        cy.getBySel("user-search-result").first().click();
        cy.getBySel("transaction-amount-input").clear().type("100");
        cy.getBySel("transaction-description-input").clear().type("Fancy Hotel");
        cy.getBySel("transaction-type-selector").select("Request");
        cy.getBySel("submit-transaction").click();
        cy.wait("@createTransaction");
        // Simulate acceptance of the transaction request.
        cy.getBySel("accept-request-button").click();
        cy.wait("@updateTransaction");
        cy.getBySel("success-message").should("contain", "Request accepted");
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
                // For the attribute, type a test query and verify search results are returned.
                const query = "Test" + attr;
                cy.getBySel("user-search-input").clear().type(query);
                cy.getBySel("user-search-result").should("have.length.greaterThan", 0);
            });
        });
    });
});
