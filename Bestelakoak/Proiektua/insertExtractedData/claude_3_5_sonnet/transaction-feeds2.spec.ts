import Dinero from "dinero.js";
import { User, Transaction, TransactionRequestStatus, TransactionResponseItem, Contact, TransactionStatus, } from "../../../src/models";
import { addDays, isWithinInterval, startOfDay } from "date-fns";
import { startOfDayUTC, endOfDayUTC } from "../../../src/utils/transactionUtils";
import { isMobile } from "../../support/utils";
const { _ } = Cypress;
type TransactionFeedsCtx = {
    allUsers?: User[];
    user?: User;
    contactIds?: string[];
};
describe("Transaction Feed", function () {
    const ctx: TransactionFeedsCtx = {};
    const feedViews = {
        public: {
            tab: "public-tab",
            tabLabel: "everyone",
            routeAlias: "publicTransactions",
            service: "publicTransactionService",
        },
        contacts: {
            tab: "contacts-tab",
            tabLabel: "friends",
            routeAlias: "contactsTransactions",
            service: "contactTransactionService",
        },
        personal: {
            tab: "personal-tab",
            tabLabel: "mine",
            routeAlias: "personalTransactions",
            service: "personalTransactionService",
        },
    };
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/notifications").as("notifications");
        cy.intercept("GET", "/transactions*").as(feedViews.personal.routeAlias);
        cy.intercept("GET", "/transactions/public*").as(feedViews.public.routeAlias);
        cy.intercept("GET", "/transactions/contacts*").as(feedViews.contacts.routeAlias);
        cy.database("filter", "users").then((users: User[]) => {
            ctx.user = users[0];
            ctx.allUsers = users;
            cy.loginByXstate(ctx.user.username);
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
// Visit home page which shows transaction feed

cy.visit("/");



// Wait for transactions to load

cy.wait("@publicTransactions");



// Verify transaction feed container exists

cy.getBySel("transaction-list").should("be.visible");



// Check for different transaction item variations

cy.getBySel("transaction-item").each($el => {

// Verify basic transaction elements

cy.wrap($el).within(() => {

// Verify sender/receiver info exists

cy.get("[data-test*='transaction-sender-']").should("exist");

cy.get("[data-test*='transaction-receiver-']").should("exist");



// Verify amount is displayed

cy.get("[data-test*='transaction-amount-']").should("exist");



// Verify description exists

cy.get("[data-test*='transaction-description-']").should("exist");



// Verify date is displayed

cy.get("[data-test*='transaction-created-']").should("exist");

});

});



// Take a snapshot for visual verification

cy.visualSnapshot("Transaction Item Variations");

});



// Test: iterates through each feed view type

_.each(feedViews, (feed, feedName) => {

it(`paginates and filters ${feedName} transactions feed`, () => {

// Visit the appropriate feed page

cy.visit("/");



// Click the feed tab

cy.getBySel(feed.tab).click();



// Wait for feed transactions to load

cy.wait(`@${feed.routeAlias}`);



// Verify feed header

cy.getBySel(`${feedName}-header`).should("be.visible");



// Verify transaction list is present

cy.getBySel("transaction-list").should("be.visible");



// Check pagination if transactions exist

cy.get("body").then($body => {

if ($body.find("[data-test='transaction-item']").length > 0) {

// Verify at least one transaction is displayed

cy.getBySel("transaction-item").should("have.length.at.least", 1);



// Test pagination if more than 10 items

if ($body.find("[data-test='transaction-item']").length >= 10) {

// Click next page button

cy.getBySel("pagination-next").click();



// Verify new transactions loaded

cy.wait(`@${feed.routeAlias}`);

cy.getBySel("transaction-list").should("be.visible");

}

} else {

// If no transactions, verify empty state

cy.getBySel("empty-list-header").should("be.visible");

}

});



// Take a snapshot of the feed view

cy.visualSnapshot(`${feedName} Feed View`);

});


 });
        _.each(feedViews, (feed, feedName) => {});
    });
});
