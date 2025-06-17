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
    describe("filters transaction feeds by amount range", function () {
        const dollarAmountRange = {
            min: 200,
            max: 800,
        };
        _.each(feedViews, (feed, feedName) => {
            it('filters ${feedName} transaction feed by amount range', () => {
    // Select the public feed tab

      cy.getBySel(feedViews.public.tab).click();
      cy.wait(`@${feedViews.public.routeAlias}`);

      // Open the amount range filter UI (assume a button or input exists)

      cy.getBySel("transaction-amount-range-min").clear().type(dollarAmountRange.min);
      cy.getBySel("transaction-amount-range-max").clear().type(dollarAmountRange.max);

      // Apply the filter

      cy.getBySel("apply-amount-range-filter").click();

      // Assert that all visible transactions have amounts within the specified range

      cy.getBySelLike("transaction-item").each($el => {
        cy.wrap($el).find("[data-test=transaction-amount]").invoke("text").then(amountText => {
          // Remove currency symbol and commas, then parse as float

          const amount = parseFloat(amountText.replace(/[^0-9.-]+/g, ""));
          expect(amount).to.be.at.least(dollarAmountRange.min);
          expect(amount).to.be.at.most(dollarAmountRange.max);
        });
      });
  });
        });
    });
});
