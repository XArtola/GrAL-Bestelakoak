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
        // Navigate to the new transaction form
        cy.getBySel("new-transaction").click();
        cy.wait("@allUsers");

        // Search for a user
        cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        
        // Select the first user from the results
        cy.getBySel("user-list-item").first().click();
        
        // Fill out the payment form
        cy.getBySel("amount-input").type("35");
        cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");
        
        // Submit payment
        cy.getBySelLike("transaction-create-submit-payment").click();
        
        // Confirm the transaction was created
        cy.wait("@createTransaction");
        
        // Verify we're redirected to the personal transactions page
        cy.getBySel("personal-tab").should("have.class", "Mui-selected");
        cy.getBySel("transaction-list").should("be.visible");
        
        // Verify the new transaction appears in the list
        cy.getBySel("transaction-item").first().should("contain", "Sushi dinner 🍣");
        cy.getBySel("transaction-item").first().should("contain", "$35");
    });
    
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // Navigate to the new transaction form
        cy.getBySel("new-transaction").click();
        cy.wait("@allUsers");
        
        // Search for a user
        cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        
        // Select the first user from the results
        cy.getBySel("user-list-item").first().click();
        
        // Fill out the request form
        cy.getBySel("amount-input").type("95");
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");
        
        // Submit request (instead of payment)
        cy.getBySelLike("transaction-create-submit-request").click();
        
        // Confirm the transaction request was created
        cy.wait("@createTransaction");
        
        // Verify we're redirected to the personal transactions page
        cy.getBySel("personal-tab").should("have.class", "Mui-selected");
        cy.getBySel("transaction-item").first().should("contain", "Fancy Hotel 🏨");
        cy.getBySel("transaction-item").first().should("contain", "$95");
        cy.getBySel("transaction-item").first().should("contain", "requested");
    });
    
    it("displays new transaction errors", () => {
        // Navigate to the new transaction form
        cy.getBySel("new-transaction").click();
        cy.wait("@allUsers");
        
        // Select a user without entering an amount or description
        cy.getBySel("user-list-item").first().click();
        
        // Try to submit payment without required fields
        cy.getBySelLike("transaction-create-submit-payment").click();
        
        // Verify error messages
        cy.get(".MuiFormHelperText-root").should("be.visible");
        cy.getBySelLike("transaction-create-submit-payment").should("be.disabled");
        
        // Enter invalid amount (zero or negative)
        cy.getBySel("amount-input").type("0");
        cy.get(".MuiFormHelperText-root").should("contain", "Valid amount required");
        
        // Enter valid amount but still no description
        cy.getBySel("amount-input").clear().type("35");
        
        // Verify payment button is still disabled due to missing description
        cy.getBySelLike("transaction-create-submit-payment").should("be.disabled");
        
        // Enter a description to enable the submit button
        cy.getBySel("transaction-create-description-input").type("Test");
        cy.getBySelLike("transaction-create-submit-payment").should("not.be.disabled");
    });
    
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // First create a payment
        cy.getBySel("new-transaction").click();
        cy.wait("@allUsers");
        
        // Select a user
        cy.getBySel("user-list-item").first().click();
        
        // Enter payment details
        cy.getBySel("amount-input").type("25");
        cy.getBySel("transaction-create-description-input").type("Indian Food");
        
        // Submit payment
        cy.getBySelLike("transaction-create-submit-payment").click();
        cy.wait("@createTransaction");
        
        // Logout and login as the contact (receiver)
        cy.switchUserByXstate(ctx.contact!.username);
        
        // Check the receiver's transaction list
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        
        // Verify the transaction appears in the receiver's list
        cy.getBySel("transaction-item").first().should("contain", "Indian Food");
        cy.getBySel("transaction-item").first().should("contain", "$25");
        cy.getBySel("transaction-item").first().should("contain", "received");
    });
    
    it("submits a transaction request and accepts the request for the receiver", () => {
        // First create a request
        cy.getBySel("new-transaction").click();
        cy.wait("@allUsers");
        
        // Select a user
        cy.getBySel("user-list-item").first().click();
        
        // Enter request details
        cy.getBySel("amount-input").type("100");
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel");
        
        // Submit request
        cy.getBySelLike("transaction-create-submit-request").click();
        cy.wait("@createTransaction");
        
        // Logout and login as the contact (receiver of request)
        cy.switchUserByXstate(ctx.contact!.username);
        
        // Go to personal transactions
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        
        // Find and click on the transaction request
        cy.getBySel("transaction-item").first().should("contain", "Fancy Hotel").click();
        
        // Accept the request
        cy.getBySel("transaction-accept-request").click();
        cy.wait("@updateTransaction");
        
        // Verify the transaction status is updated
        cy.getBySel("transaction-detail-header").should("contain", "paid");
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
                // Get the value to search for from the contact user
                const searchValue = ctx.contact![attr];
                
                // Skip test if there's no value to search for
                if (!searchValue) {
                    cy.log(`${attr} not available for search`);
                    return;
                }
                
                // Search for the value
                cy.getBySel("user-list-search-input").type(searchValue.toString());
                cy.wait("@usersSearch");
                
                // Verify the search results contain the search value
                cy.getBySel("user-list-item")
                    .first()
                    .find(`[data-test*="user-list-item-${attr}"]`)
                    .should("contain", searchValue);
            });
        });
    });
});
