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
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
// it("closes date range picker modal") - Mobile specific test
it("closes date range picker modal", () => {
// Navigate to personal feed
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");

// Open date range picker
cy.getBySel("filter-date-range-button").click();

// Verify modal is open
cy.getBySel("date-range-picker-modal").should("be.visible");

// Close the modal (typically via close button or backdrop click)
cy.getBySel("date-range-picker-close").click();

// Verify modal is closed
cy.getBySel("date-range-picker-modal").should("not.exist");
});

// Note: The _.each(feedViews, (feed, feedName) => {}) block appears incomplete
// Based on the test structure, this should test date range filtering for each feed view
// Here's what the complete implementation might look like:

/*
_.each(feedViews, (feed, feedName) => {
it(`filters ${feedName} transactions by date range`, () => {
// Navigate to the specific feed
cy.getBySel(`nav-${feed.tab}`).click();
cy.wait(`@${feed.routeAlias}`);

// Open date range filter
cy.getBySel("filter-date-range-button").click();

// Set date range (last 30 days)
const endDate = new Date();
const startDate = addDays(endDate, -30);

cy.getBySel("date-range-start").clear().type(startDate.toISOString().split('T')[0]);
cy.getBySel("date-range-end").clear().type(endDate.toISOString().split('T')[0]);

// Apply filter
cy.getBySel("date-range-apply").click();

// Wait for filtered results
cy.wait(`@${feed.routeAlias}`);

// Verify transactions are within date range
cy.getBySel("transaction-item").each(($transaction) => {
cy.wrap($transaction).within(() => {
cy.getBySel("transaction-date").invoke('text').then((dateText) => {
const transactionDate = new Date(dateText);
expect(isWithinInterval(transactionDate, { start: startOfDay(startDate), end: endDate })).to.be.true;
});
});
});
});
});
*/
 });
        }
        _.each(feedViews, (feed, feedName) => {});
    });
});
