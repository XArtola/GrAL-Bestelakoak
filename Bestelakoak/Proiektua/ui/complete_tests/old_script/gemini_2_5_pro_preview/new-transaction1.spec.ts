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
// Navigate to the new transaction page

cy.getBySelLike("new-transaction").click();

cy.wait("@allUsers");



// Select the contact user from the list

// This assumes ctx.contact is populated and visible in the list.

// A more robust selector might search by username or name if the list order is not guaranteed.

if (ctx.contact?.username) {

cy.getBySel("user-list-item").contains(ctx.contact.username).click();

} else {

// Fallback if username is not available, click the first available user (excluding self if possible)

// This part needs more information on how users are listed to make it robust.

// For now, clicking the first item, assuming it's a contact.

cy.getBySelLike("user-list-item").first().click();

}



// Enter amount from userInfo.paymentTransactions[0].amount

cy.getBySel("amount-input").type(userInfo.paymentTransactions[0].amount);



// Enter description from userInfo.paymentTransactions[0].description

cy.getBySel("transaction-create-description-input").type(userInfo.paymentTransactions[0].description);



// Click Pay button

cy.getBySel("transaction-create-submit-payment").click();



// Wait for transaction creation

cy.wait("@createTransaction").its("response.statusCode").should("equal", 200);



// Assert that the user is redirected to the personal transactions page (or home page which defaults to personal)

cy.location("pathname").should("equal", "/");

cy.getBySel("nav-personal-tab").should("have.class", "Mui-selected");



// Assert that the new transaction appears in the list

cy.getBySel("transaction-item")

.first()

.should("contain", userInfo.paymentTransactions[0].description)

.and("contain", `$${userInfo.paymentTransactions[0].amount}`);
 });
});
