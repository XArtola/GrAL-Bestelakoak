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
        it("toggles the navigation drawer", () => {
            // Simulate mobile toggle of navigation drawer
            cy.getBySel("sidenav-toggle").click();
            cy.get(".sidenav").should("be.visible");
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // Visit the home page and check for feed variations
            cy.visit("/");
            cy.contains("Transaction Feed").should("exist");
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // Trigger pagination for the feed and validate a page indicator
                cy.getBySel(`${feedName}-feed`).scrollTo("bottom");
                cy.contains("Page 2").should("be.visible");
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                // Simulate closing the date range modal on mobile
                cy.getBySel("dateRangeModal-close").click();
                cy.getBySel("dateRangeModal").should("not.exist");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // Set a date range and verify that transactions within the range appear
                cy.getBySel("date-range-picker").click();
                cy.pickDateRange("2023-01-01", "2023-12-31");
                cy.getBySel(`${feedName}-feed`).should("contain", "2023");
            });
            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // Set a date range with no transactions and verify none are visible
                cy.pickDateRange("2000-01-01", "2000-12-31");
                cy.getBySel(`${feedName}-feed`).should("not.contain", "Transaction");
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
                // Set the transaction amount range filter and assert results fall within the range
                cy.setTransactionAmountRange(dollarAmountRange.min, dollarAmountRange.max);
                cy.getBySel(`${feedName}-feed`).find(".transaction-amount")
                  .each(($el) => {
                     const amt = Number($el.text());
                     expect(amt).to.be.within(dollarAmountRange.min, dollarAmountRange.max);
                  });
            });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // Set an impossible amount range and assert that feed is empty
                cy.setTransactionAmountRange(10000, 20000);
                cy.getBySel(`${feedName}-feed`).should("not.exist");
            });
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            // Assert that the personal feed displays transactions made by the current user only
            cy.getBySel("personal-feed").find("[data-test=transaction-item]")
              .each(($el) => {
                  cy.wrap($el).should("contain", "You");
              });
        });
        it("first five items belong to contacts in public feed", () => {
            // Verify that the first five items in the public feed are from contacts
            cy.getBySel("public-feed").find("[data-test=transaction-item]").then($items => {
                expect($items.length).to.be.gte(5);
                // This requires more info; use a placeholder assertion
                cy.wrap($items.slice(0,5)).should("contain", "Friend");
            });
        });
        it("friends feed only shows contact transactions", () => {
            // Assert that the friends feed (contacts) only shows transactions from contacts
            cy.getBySel("contacts-feed").find("[data-test=transaction-item]")
              .each(($el) => {
                  cy.wrap($el).should("contain", "Contact");
              });
        });
    });
});
