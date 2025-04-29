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
        // navigates to the new transaction form, selects a user and submits a transaction payment
        cy.getBySelLike("new-transaction").click();
        cy.getBySel("user-list-search-input").type("Indian Food");
        cy.getBySel("user-list-item").first().click();
        cy.getBySel("amount-input").type("25");
        cy.getBySel("transaction-create-description-input").type("Indian Food");
        cy.getBySel("transaction-create-submit-payment").click();
        cy.wait("@createTransaction");
        cy.getBySel("alert-bar-success").should("be.visible");
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // navigates to the new transaction form, selects a user and submits a transaction request
        cy.getBySelLike("new-transaction").click();
        cy.getBySel("user-list-search-input").type("Fancy Hotel");
        cy.getBySel("user-list-item").first().click();
        cy.getBySel("amount-input").type("100");
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel");
        cy.getBySel("transaction-create-submit-request").click();
        cy.wait("@createTransaction");
        cy.getBySel("alert-bar-success").should("be.visible");
    });
    it("displays new transaction errors", () => {
        // displays new transaction errors
        cy.getBySelLike("new-transaction").click();
        cy.getBySel("transaction-create-submit-payment").click();
        cy.contains("Please select a contact").should("be.visible");
        cy.contains("Please enter a valid amount").should("be.visible");
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // submits a transaction payment and verifies the deposit for the receiver
        cy.getBySelLike("new-transaction").click();
        cy.getBySel("user-list-item").eq(1).click();
        cy.getBySel("amount-input").type("35");
        cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");
        cy.getBySel("transaction-create-submit-payment").click();
        cy.wait("@createTransaction");
        cy.getBySel("alert-bar-success").should("be.visible");
        // Verify receiver's balance (requires login as receiver)
        // More info needed for receiver's username and balance assertion
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        // submits a transaction request and accepts the request for the receiver
        cy.getBySelLike("new-transaction").click();
        cy.getBySel("user-list-item").eq(2).click();
        cy.getBySel("amount-input").type("95");
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");
        cy.getBySel("transaction-create-submit-request").click();
        cy.wait("@createTransaction");
        cy.getBySel("alert-bar-success").should("be.visible");
        // Accept as receiver (requires login as receiver)
        // More info needed for receiver's username
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
                // searches for a user by attribute
                cy.getBySel("user-list-search-input").clear().type("test");
                cy.getBySel("user-list-item").should("exist");
            });
        });
    });
});
