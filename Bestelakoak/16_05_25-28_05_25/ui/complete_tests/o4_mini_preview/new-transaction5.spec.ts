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
    it("submits a transaction request and accepts the request for the receiver", () => {
// submits a transaction request and accepts the request for the receiver

// Pick the first request payload
const request = userInfo.requestTransactions[0];

// Open the “New Transaction” form
cy.getBySelLike("new-transaction").click();
cy.wait("@allUsers");

// Search and select the contact user
cy.getBySelLike("user-list-search-input")
.type(ctx.contact!.firstName);
cy.wait("@usersSearch");
cy.getBySelLike("user-list-item").first().click();

// Switch to “Request” mode (if tabbed)
cy.getBySelLike("request-tab").click();

// Fill in the request details
cy.getBySelLike("amount-input")
.clear()
.type(request.amount.toString());
cy.getBySelLike("description-input")
.clear()
.type(request.description);

// Submit the request
cy.getBySelLike("submit-request").click();
cy.wait("@createTransaction");

// Log out as the requester
cy.getBySel("sidenav-signout").click();

// Log in as the receiver
cy.loginByXstate(ctx.contact!.username);

// View personal transactions
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");

// Open the incoming request
cy.getBySel("transaction-item")
.contains(request.description)
.click();

// Accept the request
cy.getBySel("transaction-accept-request").click();
cy.wait("@updateTransaction");

// Verify that the transaction status was updated for the receiver
cy.getBySel("transaction-item")
.first()
.should("contain", "accepted");
 });
});
