import Dinero from "dinero.js";
import {
  User,
  Transaction,
  TransactionRequestStatus,
  TransactionResponseItem,
  Contact,
  TransactionStatus,
} from "../../../src/models";
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
      it(`filters ${feedName} transaction feed by date range`, function () {
        cy.database("find", "transactions").then((transaction: Transaction) => {
          const dateRangeStart = startOfDay(new Date(transaction.createdAt));
          const dateRangeEnd = endOfDayUTC(addDays(dateRangeStart, 1));

          cy.getBySelLike(feed.tab).click().should("have.class", "Mui-selected");

          cy.wait(`@${feed.routeAlias}`).its("response.body.results").as("unfilteredResults");

          cy.pickDateRange(dateRangeStart, dateRangeEnd);

          cy.wait(`@${feed.routeAlias}`)
            .its("response.body.results")
            .then((transactions: Transaction[]) => {
              cy.getBySelLike("transaction-item").should("have.length", transactions.length);

              transactions.forEach(({ createdAt }) => {
                const createdAtDate = startOfDayUTC(new Date(createdAt));

                expect(
                  isWithinInterval(createdAtDate, {
                    start: startOfDayUTC(dateRangeStart),
                    end: dateRangeEnd,
                  }),
                  `transaction created date (${createdAtDate.toISOString()}) 
                  is within ${dateRangeStart.toISOString()} 
                  and ${dateRangeEnd.toISOString()}`
                ).to.equal(true);
              });

              cy.visualSnapshot("Date Range Filtered Transactions");
            });

          cy.log("Clearing date range filter. Data set should revert");
          cy.getBySelLike("filter-date-clear-button").click({
            force: true,
          });
          cy.getBySelLike("filter-date-range-button").should("contain", "ALL");

          cy.get("@unfilteredResults").then((unfilteredResults) => {
            cy.wait(`@${feed.routeAlias}`)
              .its("response.body.results")
              .should("deep.equal", unfilteredResults);
            cy.visualSnapshot("Unfiltered Transactions");
          });
        });
      });
    });
  });
});
