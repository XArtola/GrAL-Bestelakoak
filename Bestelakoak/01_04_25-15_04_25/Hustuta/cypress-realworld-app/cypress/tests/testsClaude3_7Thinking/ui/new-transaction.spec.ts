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
        const userInfo = {
            paymentTransactions: [
                {
                    amount: "35",
                    description: "Sushi dinner 🍣"
                },
                {
                    amount: 25,
                    description: "Indian Food"
                }
            ]
        };
        
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Search for contact by name
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        
        // Select the first user from the search results
        cy.getBySelLike("user-list-item").first().click();
        
        // Verify payment form is displayed
        cy.getBySel("payment-form").should("be.visible");
        
        // Enter payment amount
        cy.getBySelLike("amount-input").type(userInfo.paymentTransactions[0].amount);
        
        // Enter payment description
        cy.getBySelLike("description-input").type(userInfo.paymentTransactions[0].description);
        
        // Submit payment request
        cy.getBySelLike("submit-payment").click();
        
        // Wait for transaction to be created
        cy.wait("@createTransaction");
        
        // Verify user is redirected to the transactions page
        cy.getBySel("nav-personal-tab").should("exist");
        cy.getBySel("transaction-list").should("exist");
        
        // Verify the new transaction is at the top of the list with correct details
        cy.getBySel("transaction-item").first().should("contain", userInfo.paymentTransactions[0].description);
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        const userInfo = {
            requestTransactions: [
                {
                    amount: "95",
                    description: "Fancy Hotel 🏨"
                },
                {
                    amount: 100,
                    description: "Fancy Hotel"
                }
            ]
        };
        
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Search for contact by name
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        
        // Select the first user from the search results
        cy.getBySelLike("user-list-item").first().click();
        
        // Switch to request tab
        cy.getBySelLike("request-tab").click();
        
        // Verify request form is displayed
        cy.getBySel("request-form").should("be.visible");
        
        // Enter request amount
        cy.getBySelLike("amount-input").type(userInfo.requestTransactions[0].amount);
        
        // Enter request description
        cy.getBySelLike("description-input").type(userInfo.requestTransactions[0].description);
        
        // Submit request
        cy.getBySelLike("submit-request").click();
        
        // Wait for transaction to be created
        cy.wait("@createTransaction");
        
        // Verify user is redirected to the transactions page
        cy.getBySel("nav-personal-tab").should("exist");
        cy.getBySel("transaction-list").should("exist");
        
        // Verify the new transaction is at the top of the list with correct details
        cy.getBySel("transaction-item").first().should("contain", userInfo.requestTransactions[0].description);
    });
    it("displays new transaction errors", () => {
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Search for contact by name
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        
        // Select the first user from the search results
        cy.getBySelLike("user-list-item").first().click();
        
        // Submit without entering an amount or description
        cy.getBySelLike("submit-payment").click();
        
        // Verify error messages for required fields
        cy.getBySelLike("amount-input").parent().should("contain", "Please enter a valid amount");
        cy.getBySelLike("description-input").parent().should("contain", "Please enter a note");
        
        // Enter an invalid amount format
        cy.getBySelLike("amount-input").type("0");
        
        // Verify error for invalid amount
        cy.getBySelLike("amount-input").parent().should("contain", "Please enter a valid amount");
        
        // Switch to request tab
        cy.getBySelLike("request-tab").click();
        
        // Submit without entering a description
        cy.getBySelLike("amount-input").clear().type("50");
        cy.getBySelLike("submit-request").click();
        
        // Verify error message for required description
        cy.getBySelLike("description-input").parent().should("contain", "Please enter a note");
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        const paymentAmount = "35";
        const paymentDescription = "Sushi dinner 🍣";
        
        // Get receiver's initial balance
        let receiverInitialBalance;
        cy.database("find", "users", { id: ctx.contact!.id }).then((user) => {
            receiverInitialBalance = user.balance;
        });
        
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Search for contact by name
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        
        // Select the first user from the search results
        cy.getBySelLike("user-list-item").first().click();
        
        // Enter payment amount
        cy.getBySelLike("amount-input").type(paymentAmount);
        
        // Enter payment description
        cy.getBySelLike("description-input").type(paymentDescription);
        
        // Submit payment
        cy.getBySelLike("submit-payment").click();
        
        // Wait for transaction to be created
        cy.wait("@createTransaction");
        
        // Log out and log in as receiver
        cy.getBySel("sidenav-signout").click();
        cy.login(ctx.contact!.username, "s3cret");
        
        // Check receiver's updated balance
        cy.database("find", "users", { id: ctx.contact!.id }).then((user) => {
            const expectedBalance = receiverInitialBalance + Number(paymentAmount) * 100;
            expect(user.balance).to.equal(expectedBalance);
        });
        
        // Verify transaction appears in the list for receiver
        cy.getBySel("transaction-list").should("be.visible");
        cy.getBySel("transaction-item")
            .first()
            .should("contain", paymentDescription)
            .and("contain", `$${paymentAmount}`);
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        const userInfo = {
            requestTransactions: [
                {
                    amount: "95",
                    description: "Fancy Hotel 🏨"
                }
            ]
        };
        
        // Navigate to new transaction form
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        
        // Search for contact by name
        cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
        cy.wait("@usersSearch");
        
        // Select the first user from the search results
        cy.getBySelLike("user-list-item").first().click();
        
        // Switch to request tab
        cy.getBySelLike("request-tab").click();
        
        // Enter request amount
        cy.getBySelLike("amount-input").type(userInfo.requestTransactions[0].amount);
        
        // Enter request description
        cy.getBySelLike("description-input").type(userInfo.requestTransactions[0].description);
        
        // Submit request
        cy.getBySelLike("submit-request").click();
        
        // Wait for transaction to be created
        cy.wait("@createTransaction");
        
        // Log out and log in as receiver (contact)
        cy.getBySel("sidenav-signout").click();
        cy.login(ctx.contact!.username, "s3cret");
        
        // Navigate to personal transactions page
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        
        // Find the request transaction
        cy.getBySel("transaction-item")
            .filter(`:contains("${userInfo.requestTransactions[0].description}")`)
            .first()
            .click();
        
        // Wait for transaction details to load
        cy.wait("@getTransaction");
        
        // Accept the request
        cy.getBySel("transaction-accept-request").click();
        
        // Wait for the update
        cy.wait("@updateTransaction");
        
        // Verify the transaction is now complete
        cy.getBySel("transaction-payment-status").should("contain", "Complete");
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
                // Get the attribute value from the contact
                const searchValue = ctx.contact![attr];
                
                // Search for user by attribute
                cy.getBySelLike("user-list-search-input").type(searchValue);
                cy.wait("@usersSearch");
                
                // Verify search results contain the user
                cy.getBySelLike("user-list-item")
                    .should("have.length.at.least", 1)
                    .and("contain", searchValue);
            });
        });
    });
});
