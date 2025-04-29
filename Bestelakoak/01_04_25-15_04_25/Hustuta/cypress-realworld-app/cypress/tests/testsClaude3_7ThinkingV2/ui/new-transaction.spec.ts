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
        // Click on the new transaction button
        cy.getBySel("nav-top-new-transaction").click();
        
        // Search for the contact user
        if (ctx.contact?.firstName) {
            cy.getBySel("user-list-search-input").type(ctx.contact.firstName);
        }
        cy.wait("@usersSearch");
        
        // Select the user from the list
        if (ctx.contact?.firstName) {
            cy.getBySel("user-list-item").contains(ctx.contact.firstName).click();
        }
        
        // Enter payment amount
        cy.getBySel("amount-input").type("35");
        
        // Enter payment note
        cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");
        
        // Submit the payment
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Wait for request to complete
        cy.wait("@createTransaction");
        
        // Verify we're redirected to the new transaction's page
        cy.getBySel("transaction-detail-header").should("be.visible");
        cy.getBySel("transaction-description").should("contain", "Sushi dinner 🍣");
        cy.getBySel("transaction-amount").should("contain", "$35");
    });
    
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // Click on the new transaction button
        cy.getBySel("nav-top-new-transaction").click();
        
        // Search for the contact user
        cy.getBySel("user-list-search-input").type(ctx.contact.firstName);
        cy.wait("@usersSearch");
        
        // Select the user from the list
        cy.getBySel("user-list-item").contains(ctx.contact.firstName).click();
        
        // Enter request amount
        cy.getBySel("amount-input").type("95");
        
        // Enter request note
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");
        
        // Submit the request
        cy.getBySel("transaction-create-submit-request").click();
        
        // Wait for request to complete
        cy.wait("@createTransaction");
        
        // Verify we're redirected to the transaction's page
        cy.getBySel("transaction-detail-header").should("be.visible");
        cy.getBySel("transaction-description").should("contain", "Fancy Hotel 🏨");
        cy.getBySel("transaction-amount").should("contain", "$95");
    });
    
    it("displays new transaction errors", () => {
        // Navigate to the new transaction form
        cy.getBySel("nav-top-new-transaction").click();
        
        // Search for the contact user
        cy.getBySel("user-list-search-input").type(ctx.contact.firstName);
        cy.wait("@usersSearch");
        
        // Select the user from the list
        cy.getBySel("user-list-item").contains(ctx.contact.firstName).click();
        
        // Try to submit without entering an amount
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Verify error message is displayed
        cy.getBySel("transaction-create-amount-error").should("be.visible");
        
        // Enter invalid amount
        cy.getBySel("amount-input").type("0");
        
        // Try to submit with invalid amount
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Verify error message is still displayed
        cy.getBySel("transaction-create-amount-error").should("be.visible");
    });
    
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // Get the receiver's current balance
        cy.database("find", "users", { id: ctx.contact.id }).then(receiver => {
            const initialBalance = receiver.balance;
            
            // Navigate to the new transaction form
            cy.getBySel("nav-top-new-transaction").click();
            
            // Search for the receiver
            cy.getBySel("user-list-search-input").type(ctx.contact.firstName);
            cy.wait("@usersSearch");
            
            // Select the receiver
            cy.getBySel("user-list-item").contains(ctx.contact.firstName).click();
            
            // Enter payment amount
            const paymentAmount = 25;
            cy.getBySel("amount-input").type(paymentAmount.toString());
            
            // Enter payment note
            cy.getBySel("transaction-create-description-input").type("Indian Food");
            
            // Submit the payment
            cy.getBySel("transaction-create-submit-payment").click();
            cy.wait("@createTransaction");
            
            // Logout current user
            cy.getBySel("sidenav-signout").click();
            
            // Login as the receiver
            if (ctx.contact?.username) {
                cy.loginByXstate(ctx.contact.username);
            }
            
            // Verify balance increased
            cy.getBySel("sidenav-user-balance").then($balance => {
                const currentBalance = parseFloat($balance.text().replace(/[$,]/g, ""));
                const expectedBalance = initialBalance + paymentAmount * 100; // Convert dollars to cents
                expect(currentBalance).to.be.at.least(expectedBalance);
            });
            
            // Check for the transaction in personal feed
            cy.getBySel("nav-personal-tab").click();
            cy.wait("@personalTransactions");
            
            cy.getBySel("transaction-item")
                .first()
                .should("contain", "Indian Food")
                .and("contain", "$25");
        });
    });
    
    it("submits a transaction request and accepts the request for the receiver", () => {
        // Navigate to the new transaction form
        cy.getBySel("nav-top-new-transaction").click();
        
        // Search for the receiver
        cy.getBySel("user-list-search-input").type(ctx.contact.firstName);
        cy.wait("@usersSearch");
        
        // Select the receiver
        cy.getBySel("user-list-item").contains(ctx.contact.firstName).click();
        
        // Enter request amount
        const requestAmount = 100;
        cy.getBySel("amount-input").type(requestAmount.toString());
        
        // Enter request note
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel");
        
        // Submit the request
        cy.getBySel("transaction-create-submit-request").click();
        cy.wait("@createTransaction");
        
        // Logout current user
        cy.getBySel("sidenav-signout").click();
        
        // Login as the request receiver
        cy.loginByXstate(ctx.contact.username);
        
        // Go to personal transactions
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        
        // Find and click on the request
        cy.getBySel("transaction-item")
            .filter(`:contains("Fancy Hotel")`)
            .filter(`:contains("$${requestAmount}")`)
            .first()
            .click();
        
        // Accept the request
        cy.getBySel("transaction-accept-request").click();
        cy.wait("@updateTransaction");
        
        // Verify the transaction status is now "complete"
        cy.getBySel("transaction-detail-header").should("contain", "complete");
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
                // Get a property value from the contact
                const searchValue = ctx.contact[attr];
                
                if (searchValue) {
                    // Type the search value
                    cy.getBySel("user-list-search-input").type(searchValue);
                    cy.wait("@usersSearch");
                    
                    // Verify search results contain the contact
                    cy.getBySel("user-list-item")
                        .contains(ctx.contact.firstName)
                        .should("be.visible");
                }
            });
        });
    });
});
