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
        it("renders transactions item variations in feed", () => { });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => { });
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
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => { });
        it("first five items belong to contacts in public feed", () => { });
        it("friends feed only shows contact transactions", () => { });
    });
});
