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
    it("submits a transaction payment and verifies the deposit for the receiver", () => {
// 1. grab the receiver's initial balance from the database
let initialBalance: number;
cy.database("find", "users", { id: ctx.contact!.id }).then((user) => {
initialBalance = user.balance;
});

// 2. open the "New Transaction" form
cy.getBySelLike("new-transaction").click();
cy.wait("@allUsers");

// 3. search for and select the contact
cy.getBySelLike("user-list-search-input").type(ctx.contact!.firstName);
cy.wait("@usersSearch");
cy.getBySelLike("user-list-item").first().click();

// 4. fill out the payment using the first paymentTransactions entry
cy.getBySelLike("amount-input").clear().type(userInfo.paymentTransactions[0].amount);
cy.getBySelLike("description-input").clear().type(userInfo.paymentTransactions[0].description);

// 5. submit the payment
cy.getBySel("transaction-create-submit-payment").click();
cy.wait("@createTransaction");

// 6. logout the sender and log back in as the receiver
cy.getBySel("sidenav-signout").click();
cy.loginByXstate(ctx.contact!.username);

// 7. verify the new transaction appears in the receiver’s feed
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");
cy.getBySel("transaction-item").first()
.should("contain", userInfo.paymentTransactions[0].description)
.and("contain", `$${userInfo.paymentTransactions[0].amount}`);

// 8. verify the receiver’s balance in the DB increased by the payment amount
cy.database("find", "users", { id: ctx.contact!.id }).then((userAfter) => {
expect(userAfter.balance)
.to.equal(initialBalance + Number(userInfo.paymentTransactions[0].amount) * 100);
});
 });
});
