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
// Visit the main page

cy.visit("/");

cy.wait("@publicTransactions");



// Click on date range filter button to open the modal

cy.getBySel("date-range-filter-button").click();



// Verify that date range modal is open

cy.getBySel("date-range-filter-modal").should("be.visible");



// Click the close button on the modal

cy.getBySel("date-range-filter-modal-close").click();



// Verify that date range modal is closed

cy.getBySel("date-range-filter-modal").should("not.exist");

});



// For each feed view test (dynamically generated)

_.each(feedViews, (feed, feedName) => {

it(`filters ${feedName} transaction feed by date range`, () => {

// Navigate to the correct feed tab

cy.visit("/");

cy.getBySel(feed.tab).click();

cy.wait(`@${feed.routeAlias}`);



// Get current transaction count for comparison later

cy.getBySel("transaction-item")

.its("length")

.then((originalCount) => {

// Open the date filter

cy.getBySel("date-range-filter-button").click();



// Set date range to last 30 days

const today = new Date();

const thirtyDaysAgo = new Date(today);

thirtyDaysAgo.setDate(today.getDate() - 30);



// Format dates as YYYY-MM-DD for the date picker

const todayFormatted = today.toISOString().split("T")[0];

const thirtyDaysAgoFormatted = thirtyDaysAgo.toISOString().split("T")[0];



// Fill in the date range inputs

cy.getBySel("date-range-filter-start-date").type(thirtyDaysAgoFormatted);

cy.getBySel("date-range-filter-end-date").type(todayFormatted);



// Apply the filter

cy.getBySel("date-range-filter-apply").click();



// Wait for the filtered transactions to load

cy.wait(`@${feed.routeAlias}`);



// Verify the URL includes date filter parameters

cy.url().should("include", "dateRangeStart");

cy.url().should("include", "dateRangeEnd");



// Check that transactions are displayed (could be fewer than original)

cy.getBySel("transaction-item").should("exist");



// Clear the date filter

cy.getBySel("date-range-filter-button").click();

cy.getBySel("date-range-filter-clear").click();



// Wait for unfiltered transactions to reload

cy.wait(`@${feed.routeAlias}`);



// Verify filter parameters are removed from URL

cy.url().should("not.include", "dateRangeStart");

cy.url().should("not.include", "dateRangeEnd");

});

});


 });
        }
        _.each(feedViews, (feed, feedName) => {});
    });
});
