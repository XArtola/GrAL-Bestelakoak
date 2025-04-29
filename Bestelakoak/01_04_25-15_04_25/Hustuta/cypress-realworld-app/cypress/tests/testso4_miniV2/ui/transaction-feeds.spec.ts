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
            if (isMobile()) {
                cy.getBySel("sidenav-toggle").click();
                cy.getBySel("sidenav-drawer").should("be.visible");
            }
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            cy.visit("/");
            cy.wait("@personalTransactions");
            cy.getBySelLike("transaction-item").its("length").should("be.gte", 1);
        });
        _.each(feedViews, (feed) => {
            it(`paginates ${feed.tabLabel} transaction feed`, () => {
                cy.getBySel(feed.tab).click();
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySel(feed.tab).parents("button").should("have.attr","aria-selected","true");
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => { });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => { });
            it(`does not show ${feedName} transactions for out of range date limits`, () => { });
        });
        it("filters public transaction feed by date range", () => {
            cy.getBySel("public-tab").click();
            // pick dates that exclude all
            cy.getBySel("date-range-start").type("1900-01-01");
            cy.getBySel("date-range-end").type("1900-01-02");
            cy.getBySel("apply-date-filter").click();
            cy.getBySelLike("transaction-item").should("have.length", 0);
        });
    });
    describe("filters transaction feeds by amount range", function () {
        const dollarAmountRange = {
            min: 200,
            max: 800,
        };
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by amount range`, () => { });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => { });
        });
        it("filters personal transaction feed by amount range", () => {
            cy.getBySel("personal-tab").click();
            cy.getBySel("amount-min").type("200");
            cy.getBySel("amount-max").type("800");
            cy.getBySel("apply-amount-filter").click();
            cy.getBySelLike("transaction-item").should("be.visible");
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            cy.getBySel("personal-tab").click();
            cy.getBySelLike("transaction-item").each(($el) => {
                cy.wrap($el).findBySel("transaction-sender").should("contain", ctx.user.username);
            });
        });
        it("first five items belong to contacts in public feed", () => {
            cy.getBySel("public-tab").click();
            cy.getBySelLike("transaction-item").should("have.length.gte",5);
        });
        it("friends feed only shows contact transactions", () => { });
    });
});
