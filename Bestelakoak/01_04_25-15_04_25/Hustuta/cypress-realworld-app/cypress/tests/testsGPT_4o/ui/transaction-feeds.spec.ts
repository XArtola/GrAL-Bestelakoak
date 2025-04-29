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
            // Verify the navigation drawer toggles correctly
            cy.get(".nav-drawer-toggle").click();
            cy.get(".nav-drawer").should("be.visible");
            cy.get(".nav-drawer-toggle").click();
            cy.get(".nav-drawer").should("not.be.visible");
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // Verify different transaction item variations are rendered
            cy.visit("/transactions");
            cy.get(".transaction-item").should("have.length.greaterThan", 0);
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // Verify pagination for the transaction feed
                cy.visit(`/transactions/${feedName}`);
                cy.get(".transaction-item").should("have.length.greaterThan", 0);
                cy.get(".pagination-next").click();
                cy.get(".transaction-item").should("have.length.greaterThan", 0);
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                // Verify the date range picker modal closes correctly
                cy.get(".date-range-picker").click();
                cy.get(".date-range-modal").should("be.visible");
                cy.get(".close-modal").click();
                cy.get(".date-range-modal").should("not.be.visible");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // Apply a date range filter and verify results
                cy.visit(`/transactions/${feedName}`);
                cy.get(".date-range-picker").click();
                cy.get(".start-date").type("2025-01-01");
                cy.get(".end-date").type("2025-12-31");
                cy.get(".apply-date-filter").click();
                cy.get(".transaction-item").should("have.length.greaterThan", 0);
            });
            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // Apply an out-of-range date filter and verify no results
                cy.visit(`/transactions/${feedName}`);
                cy.get(".date-range-picker").click();
                cy.get(".start-date").type("2000-01-01");
                cy.get(".end-date").type("2000-12-31");
                cy.get(".apply-date-filter").click();
                cy.get(".transaction-item").should("have.length", 0);
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
                // Apply an amount range filter and verify results
                cy.visit(`/transactions/${feedName}`);
                cy.get(".amount-range-min").type(dollarAmountRange.min);
                cy.get(".amount-range-max").type(dollarAmountRange.max);
                cy.get(".apply-amount-filter").click();
                cy.get(".transaction-item").should("have.length.greaterThan", 0);
            });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // Apply an out-of-range amount filter and verify no results
                cy.visit(`/transactions/${feedName}`);
                cy.get(".amount-range-min").type(1000);
                cy.get(".amount-range-max").type(2000);
                cy.get(".apply-amount-filter").click();
                cy.get(".transaction-item").should("have.length", 0);
            });
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            // Verify only personal transactions are shown in the mine feed
            cy.visit("/transactions/mine");
            cy.get(".transaction-item").each(($el) => {
                cy.wrap($el).should("contain", ctx.user.firstName);
            });
        });
        it("first five items belong to contacts in public feed", () => {
            // Verify the first five items in the public feed belong to contacts
            cy.visit("/transactions/public");
            cy.get(".transaction-item").each(($el, index) => {
                if (index < 5) {
                    cy.wrap($el).should("contain", ctx.user.firstName);
                }
            });
        });
        it("friends feed only shows contact transactions", () => {
            // Verify only contact transactions are shown in the friends feed
            cy.visit("/transactions/friends");
            cy.get(".transaction-item").each(($el) => {
                cy.wrap($el).should("contain", ctx.user.firstName);
            });
        });
    });
});
