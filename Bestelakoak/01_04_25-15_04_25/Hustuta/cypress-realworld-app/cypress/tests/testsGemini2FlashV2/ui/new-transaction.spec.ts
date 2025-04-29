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
            if (ctx.user) {
                return cy.loginByXstate(ctx.user.username);
            }
        });
    });
    // navigates to the new transaction form, selects a user and submits a transaction payment
    it("navigates to the new transaction form, selects a user and submits a transaction payment", () => {
        // <generated_code>
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact.username);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-item").first().click();
        cy.getBySel("transaction-amount-input").type("35");
        cy.getBySel("transaction-description-input").type("Sushi dinner 🍣");
        cy.getBySel("payment-send-button").click();
        cy.wait("@createTransaction").then((interception) => {
            assert.equal(interception.response?.statusCode, 200);
        });
        // </generated_code>
    });

    // navigates to the new transaction form, selects a user and submits a transaction request
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        // <generated_code>
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact.username);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-item").first().click();
        cy.getBySel("transaction-amount-input").type("95");
        cy.getBySel("transaction-description-input").type("Fancy Hotel 🏨");
        cy.getBySel("request-money").click();
        cy.wait("@createTransaction").then((interception) => {
            assert.equal(interception.response?.statusCode, 200);
        });
        // </generated_code>
    });

    // displays new transaction errors
    it("displays new transaction errors", () => {
        // <generated_code>
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact.username);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-item").first().click();
        cy.getBySel("payment-send-button").click();
        cy.getBySel("transaction-amount-input-error").should("be.visible");
        // </generated_code>
    });

    // submits a transaction payment and verifies the deposit for the receiver
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // <generated_code>
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact.username);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-item").first().click();
        cy.getBySel("transaction-amount-input").type("25");
        cy.getBySel("transaction-description-input").type("Indian Food");
        cy.getBySel("payment-send-button").click();
        cy.wait("@createTransaction").then((interception) => {
            assert.equal(interception.response?.statusCode, 200);
        });
        // </generated_code>
    });

    // submits a transaction request and accepts the request for the receiver
    it("submits a transaction request and accepts the request for the receiver", () => {
        // <generated_code>
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact.username);
        cy.wait("@usersSearch");
        cy.getBySelLike("user-item").first().click();
        cy.getBySel("transaction-amount-input").type("100");
        cy.getBySel("transaction-description-input").type("Fancy Hotel");
        cy.getBySel("request-money").click();
        cy.wait("@createTransaction").then((interception) => {
            assert.equal(interception.response?.statusCode, 200);
        });
        // </generated_code>
    });

    // searches for a user by attribute
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
                cy.getBySel("user-list-search-input").type(ctx.contact[attr]);
                cy.wait("@usersSearch");
                cy.getBySelLike("user-item").should("have.length.at.least", 1);
                // </generated_code>
            });
        });
    });
});
