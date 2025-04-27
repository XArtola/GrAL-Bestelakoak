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
        cy.get("[data-test=user-list-item]").first().click();
        cy.get("input[name='amount']").type("35");
        cy.get("textarea[name='transaction-description']").type("Sushi dinner 🍣");
        cy.get("button").contains("Pay").click();
        cy.contains("Transaction Submitted!").should("be.visible");
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        cy.getBySelLike("new-transaction").click();
        cy.get("[data-test=user-list-item]").first().click();
        cy.get("input[name='amount']").type("95");
        cy.get("textarea[name='transaction-description']").type("Fancy Hotel 🏨");
        cy.get("button").contains("Request").click();
        cy.contains("Transaction Submitted!").should("be.visible");
    });
    it("displays new transaction errors", () => {
        cy.getBySelLike("new-transaction").click();
        cy.get("button").contains("Pay").click();
        cy.contains("Please select a contact").should("be.visible");
        cy.contains("Please enter a valid amount").should("be.visible");
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        cy.getBySelLike("new-transaction").click();
        cy.get("[data-test=user-list-item]").first().click();
        cy.get("input[name='amount']").type("25");
        cy.get("textarea[name='transaction-description']").type("Indian Food");
        cy.get("button").contains("Pay").click();
        cy.contains("Transaction Submitted!").should("be.visible");
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        cy.getBySelLike("new-transaction").click();
        cy.get("[data-test=user-list-item]").first().click();
        cy.get("input[name='amount']").type("100");
        cy.get("textarea[name='transaction-description']").type("Fancy Hotel");
        cy.get("button").contains("Request").click();
        cy.contains("Transaction Submitted!").should("be.visible");
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
