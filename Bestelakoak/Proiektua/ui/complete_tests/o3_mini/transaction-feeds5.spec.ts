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
        if (isMobile()) {}
        _.each(feedViews, (feed, feedName) => {
            it('filters ${feedName} transaction feed by date range', () => {
    // ─── filters [feedName] transaction feed by date range ─────────────────────────
    // Define a date range for filtering
    const startDate = new Date(); 
    const endDate = addDays(startDate, 7);

    // Use the custom Cypress command to pick the date range
    cy.pickDateRange(startDate, endDate); 

    // Wait for the API call associated with this feed to complete
    cy.wait(`@${feed.routeAlias}`);

    // Log the feed being verified (for debugging purposes)
    cy.log(`Verifying ${feedName} transaction feed within date range`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Verify that each transaction item’s date is within the selected range.
    // (Assumes that each transaction item has a data attribute "data-transaction-date" with an ISO date string.)
    cy.getBySel("transaction-item").each(($el) => {
      // Get the transaction date from the element's attribute.
      const transactionDateStr = $el.attr("data-transaction-date");
      expect(transactionDateStr, "Transaction date should exist").to.exist;
      const transactionDate = new Date(transactionDateStr);
  
      // Use date-fns to get the start and end of the day for comparison.
      const dayStart = startOfDay(transactionDate);
      const dayEnd = endOfDayUTC(transactionDate);
  
      // Assert that the transaction date falls within our selected date range.
      expect(
        isWithinInterval(transactionDate, { start: startOfDay(startDate), end: endOfDayUTC(endDate) }),
        `Transaction date ${transactionDateStr} for ${feedName} feed is within the range`
      ).to.be.true;
    });
  });
        });
    });
});
