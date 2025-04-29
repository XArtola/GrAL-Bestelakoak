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
        // <generated_code>
        // Navigate to the form, select a user, and submit a payment transaction
        cy.getBySel("new-transaction").click();
        cy.getBySel("user-list-item").first().click();
        cy.get("#amount").type(paymentTransactions[0].amount);
        cy.get("#description").type(paymentTransactions[0].description);
        cy.get("button[type='submit']").click();
        cy.contains("Transaction submitted successfully").should("be.visible");
        // </generated_code>
    });

    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // <generated_code>
        // Navigate to the form, select a user, and submit a request transaction
        cy.getBySel("new-transaction").click();
        cy.getBySel("user-list-item").first().click();
        cy.get("#amount").type(requestTransactions[0].amount);
        cy.get("#description").type(requestTransactions[0].description);
        cy.get("button[type='submit']").click();
        cy.contains("Transaction request submitted successfully").should("be.visible");
        // </generated_code>
    });

    it("displays new transaction errors", () => {
        // <generated_code>
        // Attempt to submit the form with missing fields and verify error messages
        cy.getBySel("new-transaction").click();
        cy.get("button[type='submit']").click();
        cy.contains("All fields are required").should("be.visible");
        // </generated_code>
    });

    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // <generated_code>
        // Submit a payment transaction and verify the receiver's deposit
        cy.getBySel("new-transaction").click();
        cy.getBySel("user-list-item").first().click();
        cy.get("#amount").type(paymentTransactions[1].amount);
        cy.get("#description").type(paymentTransactions[1].description);
        cy.get("button[type='submit']").click();
        cy.contains("Transaction submitted successfully").should("be.visible");
        cy.loginByXstate(ctx.contact.username);
        cy.contains(paymentTransactions[1].description).should("be.visible");
        // </generated_code>
    });

    it("submits a transaction request and accepts the request for the receiver", () => {
        // <generated_code>
        // Submit a request transaction and accept it as the receiver
        cy.getBySel("new-transaction").click();
        cy.getBySel("user-list-item").first().click();
        cy.get("#amount").type(requestTransactions[1].amount);
        cy.get("#description").type(requestTransactions[1].description);
        cy.get("button[type='submit']").click();
        cy.contains("Transaction request submitted successfully").should("be.visible");
        cy.loginByXstate(ctx.contact.username);
        cy.contains(requestTransactions[1].description).click();
        cy.get("button.accept-request").click();
        cy.contains("Request accepted successfully").should("be.visible");
        // </generated_code>
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
                // <generated_code>
                // Search for a user by the given attribute and verify results
                cy.get("#search").type(ctx.contact[attr]);
                cy.getBySel("user-list-item").should("contain", ctx.contact[attr]);
                // </generated_code>
            });
        });
    });
});
