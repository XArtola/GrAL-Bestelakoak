import Dinero from "dinero.js";
import { User, Transaction, TransactionRequestStatus, TransactionResponseItem, Contact, TransactionStatus, } from "../../../src/models";
import { addDays, isWithinInterval, startOfDay, parseISO } from "date-fns";
import { startOfDayUTC, endOfDayUTC } from "../../../src/utils/transactionUtils";
import { isMobile } from "../../support/utils";
const { _ } = Cypress;

type TransactionFeedsCtx = {
    allUsers?: User[];
    user?: User;
    contactIds?: string[];
    transactions?: TransactionResponseItem[];
};

describe("Transaction Feed", function () {
    const ctx: TransactionFeedsCtx = {};
    const feedViews = {
        public: {
            tab: "public-tab",
            tabLabel: "everyone",
            routeAlias: "publicTransactions",
            service: "publicTransactionService",
            selector: "[data-test=nav-public-tab]",
            feed: "[data-test=transaction-list]",
        },
        contacts: {
            tab: "contacts-tab",
            tabLabel: "friends",
            routeAlias: "contactsTransactions",
            service: "contactTransactionService",
            selector: "[data-test=nav-contacts-tab]",
            feed: "[data-test=transaction-list]",
        },
        personal: {
            tab: "personal-tab",
            tabLabel: "mine",
            routeAlias: "personalTransactions",
            service: "personalTransactionService",
            selector: "[data-test=nav-personal-tab]",
            feed: "[data-test=transaction-list]",
        },
    };

    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/notifications").as("notifications");
        cy.intercept("GET", "/transactions*").as(feedViews.personal.routeAlias);
        cy.intercept("GET", "/transactions/public*").as(feedViews.public.routeAlias);
        cy.intercept("GET", "/transactions/contacts*").as(feedViews.contacts.routeAlias);
        cy.intercept("GET", "/contacts").as("contacts");

        cy.database("filter", "users").then((users: User[]) => {
            ctx.user = users[0];
            ctx.allUsers = users;
            cy.database("filter", "contacts", { userId: ctx.user.id }).then((contacts: Contact[]) => {
              ctx.contactIds = contacts.map(contact => contact.contactUserId);
            });
            cy.loginByXstate(ctx.user.username);
        });

        cy.wait(`@${feedViews.public.routeAlias}`).then((interception) => {
          ctx.transactions = interception.response?.body.results;
        });
    });

    describe("app layout and responsiveness", function () {
        it("toggles the navigation drawer", () => {
          if (isMobile()) {
            cy.getBySel("sidenav-drawer").should("not.be.visible");
            cy.getBySel("sidenav-toggle").click();
            cy.getBySel("sidenav-drawer").should("be.visible");
            cy.get(".MuiBackdrop-root").click({ force: true });
            cy.getBySel("sidenav-drawer").should("not.be.visible");
          } else {
            cy.getBySel("sidenav-drawer").should("be.visible");
            cy.getBySel("sidenav-toggle").should("not.exist");
          }
        });
    });

    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
          cy.contains("[data-test*=transaction-item]", "paid")
            .should("contain", ctx.user!.firstName)
            .and("contain", ctx.allUsers![1].firstName);
        });

        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
              cy.get(feed.selector).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.get(feed.feed).find("[data-test*=transaction-item]").should("have.length.greaterThan", 1);
              cy.get(feed.feed).scrollTo("bottom");
              cy.wait(`@${feed.routeAlias}`);
              cy.get(feed.feed).find("[data-test*=transaction-item]").should("have.length.greaterThan", 10);
            });
        });
    });

    describe("filters transaction feeds by date range", function () {
        const dateRange = {
          start: addDays(new Date(), -3),
          end: addDays(new Date(), -1),
        };

        if (isMobile()) {
            it("closes date range picker modal", () => {
              cy.getBySelLike("filter-date-range-button").click({ force: true });
              cy.get(".MuiDialog-container").should("be.visible");
              cy.get(".MuiDialogActions-root > .MuiButton-root").first().click();
              cy.get(".MuiDialog-container").should("not.exist");
            });
        }

        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
              cy.get(feed.selector).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.pickDateRange(dateRange.start, dateRange.end);
              cy.wait(`@${feed.routeAlias}`);
              cy.get(feed.feed).find("[data-test*=transaction-item]").should("have.length.greaterThan", 0);
              cy.get(feed.feed).find("[data-test*=transaction-item]").each(($el) => {
                const createdAtString = $el.find("[data-test=transaction-createdat]").text();
                const createdAt = parseISO(createdAtString);
                expect(isWithinInterval(createdAt, { start: startOfDay(dateRange.start), end: startOfDay(dateRange.end) })).to.be.true;
              });
            });

            it(`does not show ${feedName} transactions for out of range date limits`, () => {
              cy.get(feed.selector).click();
              cy.wait(`@${feed.routeAlias}`);
              const futureStart = addDays(new Date(), 100);
              const futureEnd = addDays(new Date(), 101);
              cy.pickDateRange(futureStart, futureEnd);
              cy.wait(`@${feed.routeAlias}`);
              cy.get(feed.feed).find("[data-test*=transaction-item]").should("not.exist");
              cy.contains("No Transactions").should("be.visible");
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
              cy.get(feed.selector).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.setTransactionAmountRange(dollarAmountRange.min, dollarAmountRange.max);
              cy.wait(`@${feed.routeAlias}`);
              cy.get(feed.feed).find("[data-test*=transaction-item]").should("have.length.greaterThan", 0);
              cy.get(feed.feed).find("[data-test*=transaction-item]").each(($el) => {
                const amountString = $el.find("[data-test=transaction-amount]").text();
                const amount = Dinero({ amount: parseFloat(amountString.replace(/[^\d.-]/g, '')) * 100 }).getAmount();
                expect(amount).to.be.within(dollarAmountRange.min * 100, dollarAmountRange.max * 100);
              });
            });

            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
              cy.get(feed.selector).click();
              cy.wait(`@${feed.routeAlias}`);
              const highMin = 100000;
              const highMax = 200000;
              cy.setTransactionAmountRange(highMin, highMax);
              cy.wait(`@${feed.routeAlias}`);
              cy.get(feed.feed).find("[data-test*=transaction-item]").should("not.exist");
              cy.contains("No Transactions").should("be.visible");
            });
        });
    });

    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
          cy.get(feedViews.personal.selector).click();
          cy.wait(`@${feedViews.personal.routeAlias}`);
          cy.get(feedViews.personal.feed).find("[data-test*=transaction-item]").each(($el) => {
            const text = $el.text();
            expect(text).to.include(ctx.user!.firstName);
          });
        });

        it("first five items belong to contacts in public feed", () => {
          cy.get(feedViews.public.selector).click();
          cy.wait(`@${feedViews.public.routeAlias}`);
          cy.wait("@contacts");
          cy.get(feedViews.public.feed).find("[data-test*=transaction-item]").slice(0, 5).each(($el) => {
            const senderId = $el.find("[data-test=transaction-sender]").data("userId");
            const receiverId = $el.find("[data-test=transaction-receiver]").data("userId");
            const isContactTransaction = ctx.contactIds?.includes(senderId) || ctx.contactIds?.includes(receiverId);
            const isPersonalTransaction = senderId === ctx.user!.id || receiverId === ctx.user!.id;
            expect(isPersonalTransaction || isContactTransaction).to.be.true;
          });
        });

        it("friends feed only shows contact transactions", () => {
          cy.get(feedViews.contacts.selector).click();
          cy.wait(`@${feedViews.contacts.routeAlias}`);
          cy.wait("@contacts");
          cy.get(feedViews.contacts.feed).find("[data-test*=transaction-item]").each(($el) => {
            const senderId = $el.find("[data-test=transaction-sender]").data("userId");
            const receiverId = $el.find("[data-test=transaction-receiver]").data("userId");
            const isContactTransaction = ctx.contactIds?.includes(senderId) || ctx.contactIds?.includes(receiverId);
            const isPersonalTransaction = senderId === ctx.user!.id || receiverId === ctx.user!.id;
            expect(isPersonalTransaction || isContactTransaction).to.be.true;
          });
        });
    });
});
