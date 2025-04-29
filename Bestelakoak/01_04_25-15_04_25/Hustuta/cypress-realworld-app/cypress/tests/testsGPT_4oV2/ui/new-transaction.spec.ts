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
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact?.firstName);
        cy.getBySel("user-list-item").first().click();
        cy.getBySel("transaction-create-amount-input").type("35");
        cy.getBySel("transaction-create-description-input").type("Sushi dinner 🍣");
        cy.getBySel("transaction-create-submit-payment").click();
        cy.wait("@createTransaction");
        cy.getBySel("transaction-success").should("contain", "Transaction submitted successfully");
    });

    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact?.firstName);
        cy.getBySel("user-list-item").first().click();
        cy.getBySel("transaction-create-amount-input").type("95");
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel 🏨");
        cy.getBySel("transaction-create-submit-request").click();
        cy.wait("@createTransaction");
        cy.getBySel("transaction-success").should("contain", "Transaction submitted successfully");
    });

    it("displays new transaction errors", () => {
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-item").first().click();
        cy.getBySel("transaction-create-submit-payment").click();
        cy.getBySel("transaction-create-amount-error").should("contain", "Please enter a valid amount");
        cy.getBySel("transaction-create-description-error").should("contain", "Please enter a note");
    });

    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact?.firstName);
        cy.getBySel("user-list-item").first().click();
        cy.getBySel("transaction-create-amount-input").type("25");
        cy.getBySel("transaction-create-description-input").type("Indian Food");
        cy.getBySel("transaction-create-submit-payment").click();
        cy.wait("@createTransaction");
        if (ctx.contact?.username) {
            cy.loginByXstate(ctx.contact.username);
        } else {
            throw new Error("Contact username is undefined");
        }
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        cy.getBySel("transaction-item").first().should("contain", "25").and("contain", "Indian Food");
    });

    it("submits a transaction request and accepts the request for the receiver", () => {
        cy.getBySelLike("new-transaction").click();
        cy.wait("@allUsers");
        cy.getBySel("user-list-search-input").type(ctx.contact?.firstName);
        cy.getBySel("user-list-item").first().click();
        cy.getBySel("transaction-create-amount-input").type("100");
        cy.getBySel("transaction-create-description-input").type("Fancy Hotel");
        cy.getBySel("transaction-create-submit-request").click();
        cy.wait("@createTransaction");
        cy.loginByXstate(ctx.contact?.username);
        cy.getBySel("nav-personal-tab").click();
        cy.wait("@personalTransactions");
        cy.getBySel("transaction-item").first().click();
        cy.getBySel("transaction-accept-request").click();
        cy.wait("@updateTransaction");
        cy.getBySel("transaction-status").should("contain", "Completed");
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
            it(attr, () => { });
        });
    });
});
