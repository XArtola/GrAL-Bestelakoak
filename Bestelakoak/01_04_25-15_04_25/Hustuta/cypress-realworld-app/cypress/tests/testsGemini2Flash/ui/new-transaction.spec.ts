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

    // navigates to the new transaction form, selects a user and submits a transaction payment
    it("navigates to the new transaction form, selects a user and submits a transaction payment", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\new-transaction.spec.ts
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");
      cy.getBySel("user-list-search-input").type(ctx.contact.username);
      cy.wait("@usersSearch");
      cy.getBySelLike("user-list-item").contains(ctx.contact.username).click();
      cy.getBySel("transaction-amount-input").type(this.paymentTransactions[0].amount);
      cy.getBySel("transaction-description-input").type(this.paymentTransactions[0].description);
      cy.getBySel("transaction-submit-payment").click();
      cy.wait("@createTransaction").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.url().should("eq", "http://localhost:3000/");
      });
    });

    // navigates to the new transaction form, selects a user and submits a transaction request
    it("navigates to the new transaction form, selects a user and submits a transaction request", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\new-transaction.spec.ts
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");
      cy.getBySel("user-list-search-input").type(ctx.contact.username);
      cy.wait("@usersSearch");
      cy.getBySelLike("user-list-item").contains(ctx.contact.username).click();
      cy.getBySel("transaction-amount-input").type(this.requestTransactions[0].amount);
      cy.getBySel("transaction-description-input").type(this.requestTransactions[0].description);
      cy.getBySel("transaction-submit-request").click();
      cy.wait("@createTransaction").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.url().should("eq", "http://localhost:3000/");
      });
    });

    // displays new transaction errors
    it("displays new transaction errors", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\new-transaction.spec.ts
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");
      cy.getBySel("transaction-submit-payment").click();
      cy.getBySel("new-transaction-form").should("be.visible");
    });

    // submits a transaction payment and verifies the deposit for the receiver
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\new-transaction.spec.ts
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");
      cy.getBySel("user-list-search-input").type(ctx.contact.username);
      cy.wait("@usersSearch");
      cy.getBySelLike("user-list-item").contains(ctx.contact.username).click();
      cy.getBySel("transaction-amount-input").type(this.paymentTransactions[1].amount);
      cy.getBySel("transaction-description-input").type(this.paymentTransactions[1].description);
      cy.getBySel("transaction-submit-payment").click();
      cy.wait("@createTransaction").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.url().should("eq", "http://localhost:3000/");
      });
      cy.logoutByXstate();

      cy.loginByXstate(ctx.contact.username);
      cy.visit("/");
      cy.getBySel("nav-personal-tab").click();
      cy.wait("@personalTransactions");
      cy.getBySelLike("transaction-item").should("contain", this.paymentTransactions[1].description);
    });

    // submits a transaction request and accepts the request for the receiver
    it("submits a transaction request and accepts the request for the receiver", () => {
      // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\new-transaction.spec.ts
      cy.getBySelLike("new-transaction").click();
      cy.wait("@allUsers");
      cy.getBySel("user-list-search-input").type(ctx.contact.username);
      cy.wait("@usersSearch");
      cy.getBySelLike("user-list-item").contains(ctx.contact.username).click();
      cy.getBySel("transaction-amount-input").type(this.requestTransactions[1].amount);
      cy.getBySel("transaction-description-input").type(this.requestTransactions[1].description);
      cy.getBySel("transaction-submit-request").click();
      cy.wait("@createTransaction").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.url().should("eq", "http://localhost:3000/");
      });
      cy.logoutByXstate();

      cy.loginByXstate(ctx.contact.username);
      cy.visit("/");
      cy.getBySel("nav-personal-tab").click();
      cy.wait("@personalTransactions");
      cy.getBySelLike("transaction-item").contains(this.requestTransactions[1].description).click();
      cy.getBySel("transaction-accept-request").click();
      cy.wait("@updateTransaction").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.url().should("eq", "http://localhost:3000/");
      });
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
              // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\new-transaction.spec.ts
              cy.getBySel("user-list-search-input").type(ctx.contact[attr]);
              cy.wait("@usersSearch");
              cy.getBySelLike("user-list-item").should("contain", ctx.contact[attr]);
            });
        });
    });
});
