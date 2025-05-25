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
// Visit the home page which shows the default feed
cy.visit("/");

// Wait for transactions to load
cy.wait("@publicTransactions");

// Check that transaction items are rendering
cy.getBySel("transaction-item").should("have.length.gt", 0);

// Verify different transaction status variations are displayed correctly
cy.getBySel("transaction-item").then($items => {
// Look for different transaction statuses
const hasCompleted = $items.find("[data-test*='transaction-status-COMPLETED']").length > 0;
const hasPending = $items.find("[data-test*='transaction-status-PENDING']").length > 0;
const hasRequested = $items.find("[data-test*='transaction-status-REQUESTED']").length > 0;

// We should have at least one type of transaction status displayed
expect(hasCompleted || hasPending || hasRequested).to.be.true;
 });
        _.each(feedViews, (feed, feedName) => {});
    });
});
