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
    describe("app layout and responsiveness", function () {
        it("toggles the navigation drawer", () => { });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // Implement test to check the rendering of different transaction items.
            // More information is needed for exact verification criteria.
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // Implement pagination test for the ${feedName} feed.
                // More information is needed for page size and navigation details.
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                // Implement test to close the date range picker on mobile.
                // More information is needed regarding modal behavior.
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // Implement date range filtering for the ${feedName} feed.
                // More details (e.g. sample dates) are required.
            });
            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // Implement test to verify that transactions outside the date range are hidden.
                // More information is needed.
            });
        });
    });
    describe("filters transaction feeds by amount range", function () {
        const dollarAmountRange = {
            min: 200,
            max: 800,
        };
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by amount range`, () => {
                // Implement test to filter the ${feedName} feed by amount between 200 and 800.
                // More information is needed for expected outcomes.
            });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // Implement test to confirm transactions outside 200-800 are not displayed for ${feedName}.
                // More details are required.
            });
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            // Verify that only personal transactions appear in the 'mine' feed.
            // More information is needed on how to distinguish these items.
        });
        it("first five items belong to contacts in public feed", () => {
            // Check that the first 5 items in the public feed are from contacts.
            // More implementation details are needed.
        });
        it("friends feed only shows contact transactions", () => {
            // Verify that the friends feed shows only transactions involving contacts.
            // More details are required.
        });
    });
});
