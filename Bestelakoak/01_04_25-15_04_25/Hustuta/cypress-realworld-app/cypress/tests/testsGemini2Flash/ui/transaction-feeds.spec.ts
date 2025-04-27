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

    // toggles the navigation drawer
    describe("app layout and responsiveness", function () {
        it("toggles the navigation drawer", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
          if (isMobile()) {
            cy.getBySel("sidenav-toggle").should("be.visible").click();
            cy.getBySel("sidenav").should("be.visible");
            cy.getBySel("sidenav-toggle").click();
            cy.getBySel("sidenav").should("not.be.visible");
          }
        });
    });

    // renders and paginates all transaction feeds
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
          cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
              // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
              cy.getBySel(`nav-${feed.tab}`).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.nextTransactionFeedPage(feed.service, 2);
              cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
            });
        });
    });

    // filters transaction feeds by date range
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
              // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
              cy.getBySel("date-range-picker-toggle").click();
              cy.getBySel("date-range-picker").should("be.visible");
              cy.get(".DayPickerNavigation_button__next").click();
              cy.get(".DayPickerNavigation_button__next").click();
              cy.get(".DateRangePicker_closeButton_1wMvP").click();
              cy.getBySel("date-range-picker").should("not.be.visible");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
              // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
              const pastDate = new Date(2020, 1, 1);
              const futureDate = new Date(2020, 1, 10);
              cy.getBySel(`nav-${feed.tab}`).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.pickDateRange(pastDate, futureDate);
              cy.wait(`@${feed.routeAlias}`);
              cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
            });

            it(`does not show ${feedName} transactions for out of range date limits`, () => {
              // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
              const pastDate = new Date(2019, 1, 1);
              const futureDate = new Date(2019, 1, 10);
              cy.getBySel(`nav-${feed.tab}`).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.pickDateRange(pastDate, futureDate);
              cy.wait(`@${feed.routeAlias}`);
              cy.getBySelLike("transaction-item").should("not.exist");
            });
        });
    });

    // filters transaction feeds by amount range
    describe("filters transaction feeds by amount range", function () {
        const dollarAmountRange = {
            min: 200,
            max: 800,
        };
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by amount range`, () => {
              // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
              cy.getBySel(`nav-${feed.tab}`).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.setTransactionAmountRange(dollarAmountRange.min, dollarAmountRange.max);
              cy.wait(`@${feed.routeAlias}`);
              cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
            });

            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
              // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
              cy.getBySel(`nav-${feed.tab}`).click();
              cy.wait(`@${feed.routeAlias}`);
              cy.setTransactionAmountRange(1000, 2000);
              cy.wait(`@${feed.routeAlias}`);
              cy.getBySelLike("transaction-item").should("not.exist");
            });
        });
    });

    // Feed Item Visibility
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
          cy.getBySel(`nav-${feedViews.personal.tab}`).click();
          cy.wait(`@${feedViews.personal.routeAlias}`);
          cy.getBySelLike("transaction-item").each(($el) => {
            cy.wrap($el).should("contain", ctx.user.username);
          });
        });

        it("first five items belong to contacts in public feed", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
          cy.getBySel(`nav-${feedViews.public.tab}`).click();
          cy.wait(`@${feedViews.public.routeAlias}`);
          cy.database("filter", "contacts", { userId: ctx.user.id }).then((contacts: Contact[]) => {
            const contactIds = contacts.map((contact) => contact.contactUserId);
            cy.getBySelLike("transaction-item").each(($el, index) => {
              if (index < 5) {
                let found = false;
                contactIds.forEach(contactId => {
                  if ($el.text().includes(contactId)) {
                    found = true;
                  }
                });
                expect(found).to.be.true;
              }
            });
          });
        });

        it("friends feed only shows contact transactions", () => {
          // filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Test_gen\cypress-realworld-app\cypress\tests\ui\transaction-feeds.spec.ts
          cy.getBySel(`nav-${feedViews.contacts.tab}`).click();
          cy.wait(`@${feedViews.contacts.routeAlias}`);
          cy.database("filter", "contacts", { userId: ctx.user.id }).then((contacts: Contact[]) => {
            const contactIds = contacts.map((contact) => contact.contactUserId);
            cy.getBySelLike("transaction-item").each(($el) => {
              let found = false;
              contactIds.forEach(contactId => {
                if ($el.text().includes(contactId)) {
                  found = true;
                }
              });
              expect(found).to.be.true;
            });
          });
        });
    });
});
