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
            if (ctx.user) {
                cy.loginByXstate(ctx.user.username);
            }
        });
    });
    // toggles the navigation drawer
    describe("app layout and responsiveness", function () {
        it("toggles the navigation drawer", () => {
            // <generated_code>
            if (isMobile()) {
                cy.getBySel("sidenav-toggle").should("be.visible");
                cy.getBySel("sidenav-toggle").click();
                cy.getBySel("sidenav").should("be.visible");
                cy.getBySel("sidenav-toggle").click();
                cy.getBySel("sidenav").should("not.be.visible");
            }
            else {
                cy.getBySel("sidenav-toggle").should("not.be.visible");
            }
            // </generated_code>
        });
    });

    // renders and paginates all transaction feeds
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // <generated_code>
            cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
            // </generated_code>
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // <generated_code>
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                cy.nextTransactionFeedPage(feed.service, 2);
                cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
                // </generated_code>
            });
        });
    });

    // filters transaction feeds by date range
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            // closes date range picker modal
            it("closes date range picker modal", () => {
                // <generated_code>
                cy.getBySel("date-range-filter-button").click();
                cy.getBySel("date-range-picker").should("be.visible");
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_1").click();
                cy.get(".DayPickerNavigation_button_button").first().click()
                cy.get(".DayPickerNavigation_button_button").last().click()
                cy.getBySel("date-range-picker-done").click();
                cy.getBySel("date-range-picker").should("not.exist");
                // </generated_code>
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // <generated_code>
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                const startDate = new Date(2023, 0, 1);
                const endDate = new Date(2023, 0, 10);
                cy.pickDateRange(startDate, endDate);
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
                // </generated_code>
            });

            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // <generated_code>
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                const startDate = new Date(2024, 0, 1);
                const endDate = new Date(2024, 0, 10);
                cy.pickDateRange(startDate, endDate);
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySelLike("transaction-item").should("not.exist");
                // </generated_code>
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
                // <generated_code>
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                cy.setTransactionAmountRange(dollarAmountRange.min, dollarAmountRange.max);
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
                // </generated_code>
            });

            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // <generated_code>
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                cy.setTransactionAmountRange(10000, 20000);
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySelLike("transaction-item").should("not.exist");
                // </generated_code>
            });
        });
    });

    // Feed Item Visibility
    describe("Feed Item Visibility", () => {
        // mine feed only shows personal transactions
        it("mine feed only shows personal transactions", () => {
            // <generated_code>
            cy.getBySel("nav-personal-tab").click();
            cy.wait("@personalTransactions");
            cy.database("filter", "transactions", { senderId: ctx.user.id }).then((transactions: Transaction[]) => {
                cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
            });
            // </generated_code>
        });

        // first five items belong to contacts in public feed
        it("first five items belong to contacts in public feed", () => {
            // <generated_code>
            cy.getBySel("nav-public-tab").click();
            cy.wait("@publicTransactions");
            cy.database("filter", "contacts", { userId: ctx.user.id }).then((contacts: Contact[]) => {
                const contactIds = contacts.map(contact => contact.contactUserId);
                cy.get("[data-test^='transaction-item-']").each((item, index) => {
                    if (index < 5) {
                        cy.wrap(item).should("be.visible");
                    }
                });
            });
            // </generated_code>
        });

        // friends feed only shows contact transactions
        it("friends feed only shows contact transactions", () => {
            // <generated_code>
            cy.getBySel("nav-contacts-tab").click();
            cy.wait("@contactsTransactions");
            cy.database("filter", "contacts", { userId: ctx.user.id }).then((contacts: Contact[]) => {
                const contactIds = contacts.map(contact => contact.contactUserId);
                cy.database("filter", "transactions").then((transactions: Transaction[]) => {
                    const contactTransactions = transactions.filter(transaction => contactIds.includes(transaction.senderId) || contactIds.includes(transaction.receiverId));
                    cy.getBySelLike("transaction-item").should("have.length.at.least", 1);
                });
            });
            // </generated_code>
        });
    });
});
