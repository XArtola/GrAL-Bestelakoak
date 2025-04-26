import { User } from "models";
describe("Cypress Studio Demo", function () {
    beforeEach(function () {
        cy.task("db:seed");
        cy.database("find", "users").then((user: User) => {
            cy.login(user.username, "s3cret", { rememberUser: true });
        });
    });
    it("create new transaction", () => {
        cy.visit("/transaction/new");
        cy.get("[data-test='user-list-search-input']").type("devon becker");
        cy.get("[data-test='user-list-item']").first().click();
        cy.get("[data-test='transaction-create-amount-input']").type("50");
        cy.get("[data-test='transaction-create-description-input']").type("Test transaction");
        cy.get("[data-test='transaction-create-submit-payment']").click();
        cy.get("[data-test='alert-bar-success']").should("be.visible");
        cy.get("[data-test='transaction-item']").first().should("contain", "Test transaction");
    });

    it("create new bank account", () => {
        cy.visit("/bankaccounts");
        cy.get("[data-test='bankaccount-new']").click();
        cy.get("[data-test='bankaccount-bankName-input']").type("Test Bank");
        cy.get("[data-test='bankaccount-routingNumber-input']").type("123456789");
        cy.get("[data-test='bankaccount-accountNumber-input']").type("987654321");
        cy.get("[data-test='bankaccount-submit']").click();
        cy.get("[data-test='bankaccount-list']").should("exist");
        cy.get("[data-test='bankaccount-item']").should("contain", "Test Bank");
    });
});
