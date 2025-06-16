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

  describe("renders and paginates all transaction feeds", function () {
    it("renders transactions item variations in feed", function () {
      cy.intercept("GET", "/transactions/public*", {
        headers: {
          "X-Powered-By": "Express",
          Date: new Date().toString(),
        },
        fixture: "public-transactions.json",
      }).as("mockedPublicTransactions");

      // Visit page again to trigger call to /transactions/public
      cy.visit("/");

      cy.wait("@notifications");
      cy.wait("@mockedPublicTransactions")
        .its("response.body.results")
        .then((transactions) => {
          const getTransactionFromEl = ($el: JQuery<Element>): TransactionResponseItem => {
            const transactionId = $el.data("test").split("transaction-item-")[1];
            return _.find(transactions, (transaction) => {
              return transaction.id === transactionId;
            })!;
          };

          cy.log("🚩Testing a paid payment transaction item");
          cy.contains("[data-test*='transaction-item']", "paid").within(($el) => {
            const transaction = getTransactionFromEl($el);
            const formattedAmount = Dinero({
              amount: transaction.amount,
            }).toFormat();

            expect([TransactionStatus.pending, TransactionStatus.complete]).to.include(
              transaction.status
            );

            expect(transaction.requestStatus).to.be.empty;

            cy.getBySelLike("like-count").should("have.text", `${transaction.likes.length}`);
            cy.getBySelLike("comment-count").should("have.text", `${transaction.comments.length}`);

            cy.getBySelLike("sender").should("contain", transaction.senderName);
            cy.getBySelLike("receiver").should("contain", transaction.receiverName);

            cy.getBySelLike("amount")
              .should("contain", `-${formattedAmount}`)
              .should("have.css", "color", "rgb(255, 0, 0)");
          });

          cy.log("🚩Testing a charged payment transaction item");
          cy.contains("[data-test*='transaction-item']", "charged").within(($el) => {
            const transaction = getTransactionFromEl($el);
            const formattedAmount = Dinero({
              amount: transaction.amount,
            }).toFormat();

            expect(TransactionStatus.complete).to.equal(transaction.status);

            expect(transaction.requestStatus).to.equal(TransactionRequestStatus.accepted);

            cy.getBySelLike("amount")
              .should("contain", `+${formattedAmount}`)
              .should("have.css", "color", "rgb(76, 175, 80)");
          });

          cy.log("🚩Testing a requested payment transaction item");
          cy.contains("[data-test*='transaction-item']", "requested").within(($el) => {
            const transaction = getTransactionFromEl($el);
            const formattedAmount = Dinero({
              amount: transaction.amount,
            }).toFormat();

            expect([TransactionStatus.pending, TransactionStatus.complete]).to.include(
              transaction.status
            );
            expect([
              TransactionRequestStatus.pending,
              TransactionRequestStatus.rejected,
            ]).to.include(transaction.requestStatus);

            cy.getBySelLike("amount")
              .should("contain", `+${formattedAmount}`)
              .should("have.css", "color", "rgb(76, 175, 80)");
          });
          cy.visualSnapshot("Transaction Item");
        });
    });

    _.each(feedViews, (feed, feedName) => {});
  });
});
