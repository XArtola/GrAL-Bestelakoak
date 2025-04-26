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
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Verify the form is displayed
        cy.getBySel("user-list-search-input").should("be.visible");
        
        // Select a user from the list (the contact/second user from our test context)
        cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();
        
        // Wait for the user details to load
        cy.getBySel("transaction-create-contact-name")
          .should("contain", ctx.contact!.firstName)
          .and("contain", ctx.contact!.lastName);
        
        // Enter payment details using the test data
        cy.getBySelLike("amount").type("35");
        cy.getBySelLike("description").type("Sushi dinner 🍣");
        
        // Ensure the pay button is selected (default)
        cy.getBySel("transaction-create-submit-payment").should("not.be.disabled");
        
        // Submit the payment
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Wait for the transaction to be created
        cy.wait("@createTransaction");
        
        // Verify we're redirected to the transaction list
        cy.getBySel("personal-tab").should("be.visible");
        cy.url().should("include", "/");
        
        // Verify the new transaction appears in the list
        cy.getBySel("transaction-list").should("be.visible");
        cy.getBySel("transaction-item").first().should("contain", "Sushi dinner 🍣");
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Verify the form is displayed
        cy.getBySel("user-list-search-input").should("be.visible");
        
        // Select a user from the list
        cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();
        
        // Wait for the user details to load
        cy.getBySel("transaction-create-contact-name")
          .should("contain", ctx.contact!.firstName)
          .and("contain", ctx.contact!.lastName);
        
        // Enter request details using the test data
        cy.getBySelLike("amount").type("95");
        cy.getBySelLike("description").type("Fancy Hotel 🏨");
        
        // Switch to request mode
        cy.getBySel("transaction-create-submit-request").click();
        
        // Submit the request
        cy.getBySelLike("submit-request").click();
        
        // Wait for the transaction to be created
        cy.wait("@createTransaction");
        
        // Verify we're redirected to the transaction list
        cy.getBySel("personal-tab").should("be.visible");
        cy.url().should("include", "/");
        
        // Verify the new transaction appears in the list
        cy.getBySel("transaction-item").first().should("contain", "Fancy Hotel 🏨");
        cy.getBySel("transaction-item").first().should("contain", "requested");
    });
    it("displays new transaction errors", () => {
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Select a user from the list
        cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();
        
        // Try to submit the payment without entering any amount or description
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Verify the error message for amount
        cy.getBySel("transaction-create-amount-input").parents("div").first()
          .should("contain", "Please enter a valid amount");
        
        // Enter an invalid amount
        cy.getBySelLike("amount").type("0");
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Verify the error message for zero amount
        cy.getBySel("transaction-create-amount-input").parents("div").first()
          .should("contain", "Please enter an amount greater than $0");
        
        // Clear the amount field and enter a valid amount
        cy.getBySelLike("amount").clear().type("35");
        
        // Try to submit without a description
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Verify the error message for description
        cy.getBySel("transaction-create-description-input").parents("div").first()
          .should("contain", "Please enter a note");
        
        // Enter a description that's too long (> 255 characters)
        const longDescription = "A".repeat(256);
        cy.getBySelLike("description").type(longDescription);
        cy.getBySel("transaction-create-submit-payment").click();
        
        // Verify the error message for description length
        cy.getBySel("transaction-create-description-input").parents("div").first()
          .should("contain", "Not to exceed 255 characters");
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // Get the initial balance for the user
        let senderInitialBalance: number;
        cy.getBySel("sidenav-user-balance").then(($balance) => {
            const balanceText = $balance.text().replace(/[^0-9.-]+/g, "");
            senderInitialBalance = parseFloat(balanceText);
        });
        
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Select a user from the list
        cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();
        
        // Enter payment details using the test data
        cy.getBySelLike("amount").type("25");
        cy.getBySelLike("description").type("Indian Food");
        
        // Submit the payment
        cy.getBySel("transaction-create-submit-payment").click();
        cy.wait("@createTransaction");
        
        // Verify the payment was sent successfully
        cy.getBySel("transaction-item").first().should("contain", "Indian Food");
        
        // Check that the sender's balance decreased
        cy.getBySel("sidenav-user-balance").then(($updatedBalance) => {
            const updatedBalanceText = $updatedBalance.text().replace(/[^0-9.-]+/g, "");
            const updatedBalance = parseFloat(updatedBalanceText);
            expect(updatedBalance).to.be.lessThan(senderInitialBalance);
        });
        
        // Log out
        cy.getBySel("sidenav-signout").click();
        
        // Log in as the receiver
        cy.loginByXstate(ctx.contact!.username);
        cy.wait(["@notifications", "@personalTransactions"]);
        
        // Verify the transaction shows as a deposit in the receiver's transaction list
        cy.getBySel("transaction-list").should("be.visible");
        cy.getBySel("transaction-item").first()
          .should("contain", "Indian Food")
          .and("contain", "received");
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Select a user from the list
        cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();
        
        // Enter request details using the test data
        cy.getBySelLike("amount").type("100");
        cy.getBySelLike("description").type("Fancy Hotel");
        
        // Switch to request mode
        cy.getBySel("transaction-create-submit-request").click();
        
        // Submit the request
        cy.getBySelLike("submit-request").click();
        cy.wait("@createTransaction");
        
        // Verify the request was sent successfully
        cy.getBySel("transaction-item").first().should("contain", "Fancy Hotel");
        cy.getBySel("transaction-item").first().should("contain", "requested");
        
        // Log out as requester
        cy.getBySel("sidenav-signout").click();
        
        // Log in as the receiver of the request
        cy.loginByXstate(ctx.contact!.username);
        cy.wait(["@notifications", "@personalTransactions"]);
        
        // Verify the request appears in the receiver's transaction list
        cy.getBySel("transaction-list").should("be.visible");
        cy.getBySel("transaction-item").first()
          .should("contain", "Fancy Hotel")
          .and("contain", "requested");
        
        // Get the receiver's initial balance
        let receiverInitialBalance: number;
        cy.getBySel("sidenav-user-balance").then(($balance) => {
            const balanceText = $balance.text().replace(/[^0-9.-]+/g, "");
            receiverInitialBalance = parseFloat(balanceText);
        });
        
        // Accept the request
        cy.getBySel("transaction-item").first().click();
        cy.getBySel("transaction-accept-request").click();
        cy.wait("@updateTransaction");
        
        // Verify the transaction is now marked as "paid"
        cy.getBySel("transaction-detail-header").should("contain", "paid");
        
        // Check that the receiver's balance decreased
        cy.getBySel("sidenav-user-balance").then(($updatedBalance) => {
            const updatedBalanceText = $updatedBalance.text().replace(/[^0-9.-]+/g, "");
            const updatedBalance = parseFloat(updatedBalanceText);
            expect(updatedBalance).to.be.lessThan(receiverInitialBalance);
        });
        
        // Log out as the receiver
        cy.getBySel("sidenav-signout").click();
        
        // Log back in as the original requester
        cy.loginByXstate(ctx.user!.username);
        cy.wait(["@notifications", "@personalTransactions"]);
        
        // Verify the transaction is shown as "paid" in the requester's list
        cy.getBySel("transaction-list").should("be.visible");
        cy.getBySel("transaction-item").first()
          .should("contain", "Fancy Hotel")
          .and("contain", "paid");
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
        
        it("firstName", () => {
            // Get the first name of our contact
            const firstName = ctx.contact!.firstName;
            
            // Type the first name into the search input
            cy.getBySel("user-list-search-input").type(firstName);
            cy.wait("@usersSearch");
            
            // Verify that search results include our contact
            cy.getBySel("user-list").within(() => {
                cy.getBySel("user-list-item")
                  .should("have.length.at.least", 1)
                  .and("contain", firstName);
            });
            
            // Select the user from search results
            cy.getBySel("user-list-item").contains(firstName).click();
            
            // Verify the correct user was selected
            cy.getBySel("transaction-create-contact-name")
              .should("contain", firstName)
              .and("contain", ctx.contact!.lastName);
        });

        it("lastName", () => {
            // Get the last name of our contact
            const lastName = ctx.contact!.lastName;
            
            // Type the last name into the search input
            cy.getBySel("user-list-search-input").type(lastName);
            cy.wait("@usersSearch");
            
            // Verify that search results include our contact
            cy.getBySel("user-list").within(() => {
                cy.getBySel("user-list-item")
                  .should("have.length.at.least", 1)
                  .and("contain", lastName);
            });
            
            // Select the user from search results
            cy.getBySel("user-list-item").contains(lastName).click();
            
            // Verify the correct user was selected
            cy.getBySel("transaction-create-contact-name")
              .should("contain", ctx.contact!.firstName)
              .and("contain", lastName);
        });

        it("username", () => {
            // Get the username of our contact
            const username = ctx.contact!.username;
            
            // Type the username into the search input
            cy.getBySel("user-list-search-input").type(username);
            cy.wait("@usersSearch");
            
            // Verify that search results include our contact
            cy.getBySel("user-list").within(() => {
                cy.getBySel("user-list-item")
                  .should("have.length.at.least", 1)
                  .and("contain", username);
            });
            
            // Select the user from search results
            cy.getBySel("user-list-item").contains(username).click();
            
            // Verify the correct user was selected
            cy.getBySel("transaction-create-contact-name")
              .should("contain", ctx.contact!.firstName)
              .and("contain", ctx.contact!.lastName);
        });

        it("email", () => {
            // Get the email of our contact
            const email = ctx.contact!.email;
            
            // Type the email into the search input
            cy.getBySel("user-list-search-input").type(email);
            cy.wait("@usersSearch");
            
            // Verify that search results include our contact
            cy.getBySel("user-list").within(() => {
                cy.getBySel("user-list-item")
                  .should("have.length.at.least", 1);
            });
            
            // Select the user from search results that matches our contact
            cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();
            
            // Verify the correct user was selected
            cy.getBySel("transaction-create-contact-name")
              .should("contain", ctx.contact!.firstName)
              .and("contain", ctx.contact!.lastName);
        });

        it("phoneNumber", () => {
            // Get the phoneNumber of our contact
            const phoneNumber = ctx.contact!.phoneNumber;
            
            // Type the phoneNumber into the search input
            cy.getBySel("user-list-search-input").type(phoneNumber);
            cy.wait("@usersSearch");
            
            // Verify that search results include our contact
            cy.getBySel("user-list").within(() => {
                cy.getBySel("user-list-item")
                  .should("have.length.at.least", 1);
            });
            
            // Select the user from search results that matches our contact
            cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();
            
            // Verify the correct user was selected
            cy.getBySel("transaction-create-contact-name")
              .should("contain", ctx.contact!.firstName)
              .and("contain", ctx.contact!.lastName);
        });
    });
});
