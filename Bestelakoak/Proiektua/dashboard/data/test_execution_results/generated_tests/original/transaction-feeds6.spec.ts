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
      it(`does not show ${feedName} transactions for out of range date limits`, function () {
        const dateRangeStart = startOfDay(new Date(2014, 1, 1));
        const dateRangeEnd = endOfDayUTC(addDays(dateRangeStart, 1));

        cy.getBySelLike(feed.tab).click();
        cy.wait(`@${feed.routeAlias}`);

        cy.pickDateRange(dateRangeStart, dateRangeEnd);
        cy.wait(`@${feed.routeAlias}`);

        cy.getBySelLike("transaction-item").should("have.length", 0);
        cy.getBySel("empty-list-header").should("contain", "No Transactions");
        cy.getBySelLike("empty-create-transaction-button")
          .should("have.attr", "href", "/transaction/new")
          .contains("create a transaction", { matchCase: false })
          .should("have.css", { "text-transform": "uppercase" });
        cy.visualSnapshot("No Transactions");
      });
    });
  });
});
