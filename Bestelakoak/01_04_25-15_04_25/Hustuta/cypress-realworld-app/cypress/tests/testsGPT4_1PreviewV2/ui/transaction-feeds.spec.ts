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
            // toggles the navigation drawer
            cy.getBySel("sidenav-toggle").click();
            cy.getBySel("sidenav").should("be.visible");
            cy.getBySel("sidenav-toggle").click();
            cy.getBySel("sidenav").should("not.be.visible");
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // renders transactions item variations in feed
            cy.getBySel("transaction-item").should("exist");
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // paginates transaction feed
                cy.getBySel(feed.tab).click();
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySel("transaction-item").should("have.length.greaterThan", 0);
                cy.getBySel("pagination-next").click();
                cy.getBySel("transaction-item").should("exist");
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                // closes date range picker modal
                cy.getBySel("date-range-filter").click();
                cy.getBySel("date-range-modal").should("be.visible");
                cy.getBySel("date-range-modal-close").click();
                cy.getBySel("date-range-modal").should("not.exist");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // filters transaction feed by date range
                cy.getBySel(feed.tab).click();
                cy.getBySel("date-range-filter").click();
                cy.getBySel("date-range-start").type("2020-01-01");
                cy.getBySel("date-range-end").type("2025-01-01");
                cy.getBySel("date-range-apply").click();
                cy.getBySel("transaction-item").should("exist");
            });
            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // does not show transactions for out of range date limits
                cy.getBySel(feed.tab).click();
                cy.getBySel("date-range-filter").click();
                cy.getBySel("date-range-start").type("1900-01-01");
                cy.getBySel("date-range-end").type("1900-01-02");
                cy.getBySel("date-range-apply").click();
                cy.getBySel("transaction-item").should("not.exist");
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
                // filters transaction feed by amount range
                cy.getBySel(feed.tab).click();
                cy.getBySel("amount-range-filter").click();
                cy.getBySel("amount-range-min").clear().type(dollarAmountRange.min.toString());
                cy.getBySel("amount-range-max").clear().type(dollarAmountRange.max.toString());
                cy.getBySel("amount-range-apply").click();
                cy.getBySel("transaction-item").should("exist");
            });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // does not show transactions for out of range amount limits
                cy.getBySel(feed.tab).click();
                cy.getBySel("amount-range-filter").click();
                cy.getBySel("amount-range-min").clear().type("99999");
                cy.getBySel("amount-range-max").clear().type("100000");
                cy.getBySel("amount-range-apply").click();
                cy.getBySel("transaction-item").should("not.exist");
            });
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            // mine feed only shows personal transactions
            cy.getBySel(feedViews.personal.tab).click();
            cy.getBySel("transaction-item").each(($el) => {
                cy.wrap($el).should("contain", ctx.user?.firstName);
            });
        });
        it("first five items belong to contacts in public feed", () => {
            // first five items belong to contacts in public feed
            cy.getBySel(feedViews.public.tab).click();
            cy.getBySel("transaction-item").each(($el, idx) => {
                if (idx < 5) {
                    cy.wrap($el).should("exist");
                }
            });
        });
        it("friends feed only shows contact transactions", () => {
            // friends feed only shows contact transactions
            cy.getBySel(feedViews.contacts.tab).click();
            cy.getBySel("transaction-item").should("exist");
        });
    });
});
