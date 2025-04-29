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
        // open form
        cy.getBySel("new-transaction-button").click();
        cy.wait("@allUsers");
        // choose contact
        cy.getBySelLike("new-transaction-option").contains(ctx.contact.username).click();
        // fill payment (35, Sushi dinner 🍣)
        cy.getBySel("transaction-amount-input").type("35");
        cy.getBySel("transaction-desc-input").type("Sushi dinner 🍣");
        cy.getBySel("transaction-submit-payment").click();
        cy.wait("@createTransaction");
        // confirm in feed
        cy.contains("35.00").should("exist");
        cy.contains("Sushi dinner 🍣").should("exist");
    });
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
        cy.getBySel("new-transaction-button").click();
        cy.wait("@allUsers");
        cy.getBySelLike("new-transaction-option").contains(ctx.contact.username).click();
        // request (95, Fancy Hotel 🏨)
        cy.getBySel("transaction-amount-input").type("95");
        cy.getBySel("transaction-desc-input").type("Fancy Hotel 🏨");
        cy.getBySel("transaction-submit-request").click();
        cy.wait("@createTransaction");
        cy.contains("95.00").should("exist");
    });
    it("displays new transaction errors", () => {
        cy.getBySel("new-transaction-button").click();
        cy.wait("@allUsers");
        cy.getBySel("transaction-submit-payment").click();
        cy.contains("Amount is required");
        cy.contains("Description is required");
    });
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
        // same as first but then switch to receiver and check balance
        cy.getBySel("new-transaction-button").click();
        cy.wait("@allUsers");
        cy.getBySelLike("new-transaction-option").contains(ctx.contact.username).click();
        cy.getBySel("transaction-amount-input").type("25");
        cy.getBySel("transaction-desc-input").type("Indian Food");
        cy.getBySel("transaction-submit-payment").click();
        cy.wait("@createTransaction");
        // logout and login as receiver
        cy.logout();
        cy.loginByXstate(ctx.contact.username);
        cy.getBySel("nav-personal-tab").click();
        // verify deposit appears
        cy.contains("25.00").should("exist");
    });
    it("submits a transaction request and accepts the request for the receiver", () => {
        cy.getBySel("new-transaction-button").click();
        cy.wait("@allUsers");
        cy.getBySelLike("new-transaction-option").contains(ctx.contact.username).click();
        cy.getBySel("transaction-amount-input").type("100");
        cy.getBySel("transaction-desc-input").type("Fancy Hotel");
        cy.getBySel("transaction-submit-request").click();
        cy.wait("@createTransaction");
        // login as receiver and accept
        cy.logout();
        cy.loginByXstate(ctx.contact.username);
        cy.getBySel("nav-personal-tab").click();
        cy.getBySelLike("request-item").contains("Fancy Hotel").parent().within(() => {
            cy.getBySel("accept-request").click();
        });
        cy.wait("@updateTransaction");
        cy.contains("Completed").should("exist");
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
                cy.getBySel("new-transaction-search").clear().type(ctx.allUsers[0][attr] as string);
                cy.wait("@usersSearch");
                cy.contains(ctx.allUsers[0][attr] as string).should("exist");
            });
        });
    });
});
