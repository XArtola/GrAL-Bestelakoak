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
        it('renders transactions item variations in feed', () => {
    // renders transactions item variations in feed
    // This test will check that different transaction item types (payment, request, completed, pending, etc.) are rendered in the feed.

    cy.getBySel("public-tab").click();
    cy.wait("@publicTransactions");

    // Assert at least one transaction item is rendered
    cy.getBySelLike("transaction-item").should("exist");

    // Check for payment and request transaction types in the feed
    cy.getBySelLike("transaction-item").each(($el) => {
      cy.wrap($el).within(() => {
        cy.get("[data-test^='transaction-type-']").should("exist");
      });
    });

    // Optionally, check for at least one completed and one pending transaction
    cy.getBySelLike("transaction-item")
      .filter(":contains('completed')")
      .should("exist");

    cy.getBySelLike("transaction-item")
      .filter(":contains('pending')")
      .should("exist");
  });
        _.each(feedViews, (feed, feedName) => {});
    });
});
