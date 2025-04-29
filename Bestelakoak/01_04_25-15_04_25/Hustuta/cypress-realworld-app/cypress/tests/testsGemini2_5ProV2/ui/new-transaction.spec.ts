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
    const paymentTransactions = [
        {
            amount: "35",
            description: "Sushi dinner 🍣",
        },
        {
            amount: 25,
            description: "Indian Food",
        },
    ];
    const requestTransactions = [
        {
            amount: "95",
            description: "Fancy Hotel 🏨",
        },
        {
            amount: 100,
            description: "Fancy Hotel",
        },
    ];
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
        // Click New transaction button
        cy.getBySelLike("new-transaction").click();
        // Wait for users list to load
        cy.wait("@allUsers");
        // Select the contact (first user in the list)
        cy.getBySel("user-list-item-1").click(); // Assuming contact is the first user listed after self
        // Enter amount
        cy.getBySel("amount-input").type(paymentTransactions[0].amount);
        // Enter description
        cy.getBySel("transaction-create-description-input").type(paymentTransactions[0].description);
        // Click Pay button
        cy.getBySel("transaction-create-submit-payment").click();
        // Wait for transaction creation
        cy.wait("@createTransaction");
        // Assert success message
        cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Transaction Submitted!");
        // Assert redirection to personal feed
        cy.location("pathname").should("equal", "/");
        cy.getBySel("nav-personal-tab").should("have.class", "Mui-selected");
        // Assert transaction appears in personal feed
        cy.wait("@personalTransactions");
        cy.getBySelLike("transaction-item")
            .first()
            .should("contain", paymentTransactions[0].description)
            .and("contain", `-$${paymentTransactions[0].amount}.00`);
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // Click New transaction button
        cy.getBySelLike("new-transaction").click();
        // Wait for users list to load
        cy.wait("@allUsers");
        // Select the contact
        cy.getBySel("user-list-item-1").click();
        // Enter amount
        cy.getBySel("amount-input").type(requestTransactions[0].amount);
        // Enter description
        cy.getBySel("transaction-create-description-input").type(requestTransactions[0].description);
        // Click Request button
        cy.getBySel("transaction-create-submit-request").click();
        // Wait for transaction creation
        cy.wait("@createTransaction");
        // Assert success message
        cy.getBySel("alert-bar-success").should("be.visible").and("contain", "Transaction Submitted!");
        // Assert redirection to personal feed
        cy.location("pathname").should("equal", "/");
        cy.getBySel("nav-personal-tab").should("have.class", "Mui-selected");
        // Assert transaction appears in personal feed
        cy.wait("@personalTransactions");
        cy.getBySelLike("transaction-item")
            .first()
            .should("contain", requestTransactions[0].description)
            .and("contain", `-$${requestTransactions[0].amount}.00`); // Requested amount shown as negative initially for requester
    });
    it("displays new transaction errors", () => {
        // Click New transaction button
        cy.getBySelLike("new-transaction").click();
        // Wait for users list to load
        cy.wait("@allUsers");
        // Select the contact
        cy.getBySel("user-list-item-1").click();
        // Trigger amount error
        cy.getBySel("amount-input").focus().blur();
        cy.get("#transaction-create-amount-input-helper-text")
            .should("be.visible")
            .and("contain", "Please enter a valid amount");
        // Trigger description error
        cy.getBySel("transaction-create-description-input").focus().blur();
        cy.get("#transaction-create-description-input-helper-text")
            .should("be.visible")
            .and("contain", "Please enter a note");
        // Assert buttons are disabled
        cy.getBySel("transaction-create-submit-payment").should("be.disabled");
        cy.getBySel("transaction-create-submit-request").should("be.disabled");
        // Enter invalid amount (e.g., zero)
        cy.getBySel("amount-input").type("0");
        cy.get("#transaction-create-amount-input-helper-text")
            .should("be.visible")
            .and("contain", "Please enter a valid amount");
        // Assert buttons are still disabled
        cy.getBySel("transaction-create-submit-payment").should("be.disabled");
        cy.getBySel("transaction-create-submit-request").should("be.disabled");
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // Click New transaction button
        cy.getBySelLike("new-transaction").click();
        // Wait for users list to load
        cy.wait("@allUsers");
        // Select the contact
        cy.getBySel("user-list-item-1").click();
        // Enter amount
        cy.getBySel("amount-input").type(paymentTransactions[1].amount.toString());
        // Enter description
        cy.getBySel("transaction-create-description-input").type(paymentTransactions[1].description);
        // Click Pay button
        cy.getBySel("transaction-create-submit-payment").click();
        // Wait for transaction creation
        cy.wait("@createTransaction");
        // Switch to the contact's user
        cy.switchUser(ctx.contact!.username);
        // Go to personal feed
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        // Assert the transaction is received
        cy.getBySelLike("transaction-item")
            .first()
            .should("contain", paymentTransactions[1].description)
            .and("contain", `+$${paymentTransactions[1].amount}.00`);
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        // Click New transaction button
        cy.getBySelLike("new-transaction").click();
        // Wait for users list to load
        cy.wait("@allUsers");
        // Select the contact
        cy.getBySel("user-list-item-1").click();
        // Enter amount
        cy.getBySel("amount-input").type(requestTransactions[1].amount.toString());
        // Enter description
        cy.getBySel("transaction-create-description-input").type(requestTransactions[1].description);
        // Click Request button
        cy.getBySel("transaction-create-submit-request").click();
        // Wait for transaction creation
        cy.wait("@createTransaction");
        // Switch to the contact's user
        cy.switchUser(ctx.contact!.username);
        // Go to personal feed
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        // Find the request item
        cy.getBySelLike("transaction-item").first().as("requestItem");
        cy.get("@requestItem").should("contain", requestTransactions[1].description);
        // Accept the request
        cy.get("@requestItem").getBySelLike("accept-request").click();
        // Wait for transaction update
        cy.wait("@updateTransaction");
        // Assert the transaction shows as paid (negative amount for receiver who accepted)
        cy.get("@requestItem").should("contain", `-$${requestTransactions[1].amount}.00`);
        // Assert accept/reject buttons are gone
        cy.get("@requestItem").getBySelLike("accept-request").should("not.exist");
        cy.get("@requestItem").getBySelLike("reject-request").should("not.exist");
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
            // Navigate to new transaction page
            cy.getBySelLike("new-transaction").click();
            cy.wait("@allUsers");
        });
        searchAttrs.forEach((attr: keyof User) => {
            it(attr, () => {
                const searchTerm = ctx.contact![attr];
                // Type search term
                cy.getBySel("user-list-search-input").type(searchTerm);
                // Wait for search results
                cy.wait("@usersSearch");
                // Assert at least one user is found
                cy.getBySel("user-list").children().should("have.length.gte", 1);
                // Assert the contact is in the results
                cy.getBySel("user-list-item-1").should("contain", ctx.contact!.firstName); // Assuming first name is always displayed
            });
        });
    });
});
