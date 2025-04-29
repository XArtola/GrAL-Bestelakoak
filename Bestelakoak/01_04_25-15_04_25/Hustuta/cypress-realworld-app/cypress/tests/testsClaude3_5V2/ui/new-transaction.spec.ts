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
        cy.getBySelLike("new-transaction").click()
        cy.wait("@allUsers")
        
        // Search and select user
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName)
        cy.wait("@usersSearch")
        cy.getBySelLike("user-list-item").first().click()
        
        // Fill payment info
        cy.getBySelLike("amount-input").type("50")
        cy.getBySelLike("description-input").type("Test payment")
        cy.getBySelLike("submit-payment").click()
        cy.wait("@createTransaction")
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Search and select user
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-list-item").first().click();
        
        // Fill request info using data from extracted-test-info.json
        cy.getBySelLike("amount-input").type("95");
        cy.getBySelLike("description-input").type("Fancy Hotel 🏨");
        cy.getBySelLike("submit-request").click();
        cy.wait("@createTransaction");
    });
    it("displays new transaction errors", () => {
        cy.getBySelLike("new-transaction").click()
        cy.wait("@allUsers")
        
        // Select user without entering amount/description
        cy.getBySelLike("user-list-item").first().click()
        cy.getBySelLike("submit-payment").click()
        
        // Verify error messages
        cy.get(".MuiFormHelperText-root")
            .should("contain", "Please enter a valid amount")
            .and("contain", "Please enter a note")
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        const paymentAmount = "35";
        const description = "Sushi dinner 🍣";
        
        // Create payment
        cy.getBySelLike("new-transaction").click();
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-list-item").first().click();
        cy.getBySelLike("amount-input").type(paymentAmount);
        cy.getBySelLike("description-input").type(description);
        cy.getBySelLike("submit-payment").click();
        cy.wait("@createTransaction");
        
        // Verify receiver's transaction list
        cy.loginByXstate(ctx.contact!.username);
        cy.visit("/");
        cy.getBySelLike("transaction-list-item").first()
            .should("contain", description)
            .and("contain", paymentAmount);
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        // Create request using data from extracted-test-info.json
        cy.getBySelLike("new-transaction").click();
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-list-item").first().click();
        cy.getBySelLike("amount-input").type("100");
        cy.getBySelLike("description-input").type("Fancy Hotel");
        cy.getBySelLike("submit-request").click();
        cy.wait("@createTransaction");
        
        // Login as receiver and accept request
        cy.loginByXstate(ctx.contact!.username);
        cy.visit("/");
        cy.getBySelLike("transaction-list-item").first().click();
        cy.getBySelLike("transaction-accept-request").click();
        cy.wait("@updateTransaction");
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
                // Search for user by attribute and ensure value is string
                const searchValue = String(ctx.contact![attr] || '');
                cy.getBySelLike("user-list-search-input")
                    .type(searchValue);
                cy.wait("@usersSearch");
                
                // Verify search results using string value
                cy.getBySelLike("user-list-item")
                    .first()
                    .contains(searchValue);
            });
        });
    });
});
