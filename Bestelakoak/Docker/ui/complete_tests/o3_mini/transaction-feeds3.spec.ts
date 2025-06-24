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
        _.each(feedViews, (feed, feedName) => {
            it('paginates ${feedName} transaction feed', () => {
    // Test description: paginates public transaction feed
    // Wait for the public transactions to load
    cy.wait("@publicTransactions");

    // Assert that at least one transaction item is visible
    cy.getBySelLike("transaction-item")
      .should("have.length.greaterThan", 0)
      .then((initialItems) => {
        const initialCount = initialItems.length;

        // Scroll to the bottom to trigger pagination
        cy.get("body").scrollTo("bottom", { duration: 500 });

        // Optionally wait for the next page call (if it re-fires the intercept)
        cy.wait(1000); // adjust waiting time as needed

        // Assert that more items have loaded after scrolling
        cy.getBySelLike("transaction-item")
          .its("length")
          .should("be.greaterThan", initialCount);

        // Optionally check that any loading spinner is no longer visible
        cy.getBySel("loading-spinner").should("not.exist");
      });
  });
        });
    });
});
