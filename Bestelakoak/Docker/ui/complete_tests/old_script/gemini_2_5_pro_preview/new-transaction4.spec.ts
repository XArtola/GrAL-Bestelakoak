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
// Define payment details from userInfo

const paymentAmount = userInfo.paymentTransactions[0].amount;

const paymentDescription = userInfo.paymentTransactions[0].description;

let receiverInitialBalance: number;



// Get receiver's initial balance

cy.database("find", "users", { id: ctx.contact!.id }).then((user: User) => {

receiverInitialBalance = user.balance;

});



// Navigate to new transaction form

cy.getBySel("nav-top-new-transaction").click();

cy.wait("@allUsers");



// Select the contact user

cy.getBySel("user-list-search-input").type(ctx.contact!.firstName);

cy.wait("@usersSearch");

cy.getBySel("user-list-item").contains(ctx.contact!.firstName).click();



// Enter payment amount

cy.getBySel("amount-input").type(paymentAmount);



// Enter payment description

cy.getBySel("transaction-create-description-input").type(paymentDescription);



// Submit payment

cy.getBySel("transaction-create-submit-payment").click();



// Wait for transaction to be created

cy.wait("@createTransaction");



// Logout as the sender

cy.getBySel("sidenav-signout").click();



// Login as the receiver

cy.loginByXstate(ctx.contact!.username);



// Verify receiver's balance has increased

cy.database("find", "users", { id: ctx.contact!.id }).then((user: User) => {

const expectedBalance = receiverInitialBalance + parseFloat(paymentAmount) * 100;

expect(user.balance).to.equal(expectedBalance);

});



// Go to personal transactions

cy.getBySel("nav-personal-tab").click();

cy.wait("@personalTransactions");



// Verify the transaction appears in the receiver's list

cy.getBySel("transaction-item")

.first()

.should("contain", paymentDescription)

.and("contain", `$${paymentAmount}`);
 });
});
