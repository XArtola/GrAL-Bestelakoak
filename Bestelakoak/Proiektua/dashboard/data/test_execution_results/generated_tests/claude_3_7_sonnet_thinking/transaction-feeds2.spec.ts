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
// Visit the home page which shows transaction feed

  cy.visit("/");
  cy.wait("@publicTransactions");

  // Check that transaction items are visible

  cy.getBySel("transaction-item").should("have.length.at.least", 1);

  // Verify different transaction item components are displayed

  cy.getBySel("transaction-item").first().within(() => {
    // Check for sender/receiver avatars and names

    cy.getBySel("transaction-avatar").should("be.visible");
    cy.getBySel("transaction-sender").should("be.visible");
    cy.getBySel("transaction-action").should("be.visible");
    cy.getBySel("transaction-receiver").should("be.visible");

    // Check for amount and payment details

    cy.getBySel("transaction-amount").should("be.visible");
    cy.getBySel("transaction-description").should("be.visible");

    // Check for date/time information

    cy.getBySel("transaction-created-date").should("be.visible");
  });

  // Check for different transaction states if they exist

  cy.getBySel("transaction-item").then($items => {
    if ($items.length > 1) {
      // Try to find different transaction types (payment vs. request)

      cy.getBySel("transaction-payment").should("exist");

      // Some transactions might be requests instead of payments

      cy.getBySel("transaction-request").should("exist");
    }
  });
 });
        _.each(feedViews, (feed, feedName) => {});
    });
});
