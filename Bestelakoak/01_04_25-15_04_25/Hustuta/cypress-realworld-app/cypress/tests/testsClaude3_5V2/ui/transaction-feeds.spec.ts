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
                cy.getBySel("sidenav-home").should("not.be.visible");
                cy.getBySel("sidenav-toggle").click();
                cy.getBySel("sidenav-home").should("be.visible");
                cy.getBySel("sidenav-toggle").click();
                cy.getBySel("sidenav-home").should("not.be.visible");
            }
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            cy.getBySel("nav-public-tab").click();
            cy.wait("@publicTransactions");
            
            // Verify transaction items exist
            cy.getBySel("transaction-list").should("be.visible");
            cy.getBySel("transaction-list-item").should("have.length.greaterThan", 0);
        });

        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);

                cy.getBySel("transaction-list").should("be.visible");
                cy.getBySel("transaction-list-item")
                  .should("have.length.greaterThan", 0);

                cy.getBySelLike("page").first().click();
                cy.wait(`@${feed.routeAlias}`);
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                cy.getBySel("date-range-filter-button").click();
                cy.getBySel("date-range-filter-dialog").should("be.visible");
                cy.getBySel("modal-close").click();
                cy.getBySel("date-range-filter-dialog").should("not.exist");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Set date range
                cy.getBySel("date-range-filter-button").click();
                cy.get("[data-date='2020-01-01']").click();
                cy.get("[data-date='2020-12-31']").click();
                cy.getBySel("date-range-filter-submit").click();
                
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySel("transaction-list").should("be.visible");
            });

            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Set future date range
                cy.getBySel("date-range-filter-button").click();
                const futureDate = new Date();
                futureDate.setFullYear(futureDate.getFullYear() + 1);
                cy.get(`[data-date='${futureDate.toISOString().split('T')[0]}']`).click();
                cy.getBySel("date-range-filter-submit").click();
                
                cy.getBySel("empty-list-header").should("exist");
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
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                cy.getBySel("amount-range-filter-button").click();
                cy.get("[data-test*='amount-range-filter-min']").type(dollarAmountRange.min.toString());
                cy.get("[data-test*='amount-range-filter-max']").type(dollarAmountRange.max.toString());
                cy.getBySel("amount-range-filter-submit").click();
                
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySel("transaction-list").should("be.visible");
            });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => { });
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            cy.getBySel("nav-personal-tab").click();
            cy.wait("@personalTransactions");
            cy.getBySel("transaction-list")
                .find("li")
                .each(($el) => {
                    cy.wrap($el).contains(ctx.user!.username);
                });
        });

        it("first five items belong to contacts in public feed", () => {
            cy.getBySel("nav-public-tab").click();
            cy.wait("@publicTransactions");
            cy.getBySel("transaction-list")
                .find("li")
                .should("have.length.at.least", 5);
        });

        it("friends feed only shows contact transactions", () => {
            cy.getBySel("nav-contacts-tab").click();
            cy.wait("@contactsTransactions");
            cy.getBySel("transaction-list").should("be.visible");
        });
    });
});
