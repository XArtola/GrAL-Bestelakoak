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
            it('does not show ${feedName} transactions for out of range date limits', () => {
    // Test: does not show public transactions for out of range date limits
    // Step 1: Navigate to the app (assuming the user has been logged in in beforeEach)
    // Step 2: Set an out‐of‐range date range (e.g. a month far in the past)
    const pastStartDate = new Date('2000-01-01');
    const pastEndDate = new Date('2000-01-02');
    cy.pickDateRange(pastStartDate, pastEndDate);
    // Wait for the public transactions network call
    cy.wait("@publicTransactions");
    // Assert that no public transaction items are visible for the 'public-tab'
    // (Assumes a data-test attribute like "public-tab-transaction-item" exists)
    cy.getBySel("public-tab-transaction-item").should("not.exist");
  });
        });
    });
});
