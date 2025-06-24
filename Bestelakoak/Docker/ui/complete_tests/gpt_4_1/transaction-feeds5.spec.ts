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
    // Select the public feed tab

      cy.getBySel("public-tab").click();
      cy.wait("@publicTransactions");

      // Open the date range picker

      cy.getBySel("date-range-picker").click();

      // Pick a date range (e.g., last 7 days)

      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      cy.pickDateRange(sevenDaysAgo, today);

      // Assert that all visible transactions are within the selected date range

      cy.getBySelLike("transaction-item").each($el => {
        cy.wrap($el).find("[data-test=transaction-date]").invoke("text").then(dateText => {
          const txDate = new Date(dateText);
          expect(txDate >= sevenDaysAgo && txDate <= today).to.be.true;
        });
      });
  });
        });
    });
});
