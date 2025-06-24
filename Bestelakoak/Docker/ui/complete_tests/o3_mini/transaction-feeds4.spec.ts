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
            it('closes date range picker modal', () => {
    // Original it block: // it("closes date range picker modal", () => { });

    // For mobile devices, the date range picker modal should appear and be closable
    // Step 1: Verify the modal is visible
    cy.get('[data-cy="date-range-picker"]').should("be.visible");

    // Step 2: Click the close button on the modal (update the selector as needed)
    cy.get('[data-cy="date-range-picker-close"]').click();

    // Step 3: Assert that the modal is no longer visible
    cy.get('[data-cy="date-range-picker"]').should("not.exist");


    // Original _.each block over feedViews:
    _.each(feedViews, (feed, feedName) => {
      // Here we assume that for each feed view, the date range filter functionality should work.
      // The following code simulates selecting a date range and asserting that the feed is correctly filtered.
      // NOTE: Update the data-cy selectors and date input formats as needed.

      // Log the feed view being tested for clarity
      cy.log(`Testing date range filtering for the ${feedName} feed`);

      // Step 1: Open the date range picker via the filter button
      cy.get('[data-cy="date-filter-button"]').click();

      // Step 2: Define a start and end date for the filter.
      // Using today's date and one week later for demonstration purposes.
      const today = new Date();
      const startDate = today;
      const endDate = Cypress._.addDays(today, 7);

      // Step 3: Fill in the start date (assuming an input format like "YYYY-MM-DD")
      cy.get('[data-cy="start-date-input"]')
        .clear()
        .type(startDate.toISOString().split("T")[0]);

      // Step 4: Fill in the end date
      cy.get('[data-cy="end-date-input"]')
        .clear()
        .type(endDate.toISOString().split("T")[0]);

      // Step 5: Apply the date filter
      cy.get('[data-cy="apply-date-filter"]').click();

      // Step 6: Wait for the network response and reload of transactions in this feed view
      cy.wait(`@${feed.routeAlias}`);

      // Step 7: Assert that each transaction item in the feed has a date within the expected range.
      // This assumes each transaction element has a 'data-transaction-date' attribute.
      cy.get('[data-cy="transaction-item"]').each(($el) => {
        const dateStr = $el.attr("data-transaction-date");
        if (dateStr) {
          const transactionDate = new Date(dateStr);
          // Use the provided utility functions to normalize the dates if necessary
          expect(
            transactionDate >= startOfDayUTC(startDate) &&
              transactionDate <= endOfDayUTC(endDate)
          ).to.be.true;
        } else {
          // If no date attribute is found, flag the inconsistency.
          throw new Error("Transaction item is missing the 'data-transaction-date' attribute");
        }
      });
    });
  });
        }
        _.each(feedViews, (feed, feedName) => {});
    });
});
