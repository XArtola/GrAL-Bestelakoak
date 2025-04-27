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
            // Check if mobile viewport
            if (isMobile()) {
                // Navigation should be hidden initially
                cy.getBySel("sidenav-home").should("not.be.visible");
                
                // Open navigation drawer by clicking the hamburger icon
                cy.getBySel("sidenav-toggle").click();
                
                // Navigation should now be visible
                cy.getBySel("sidenav-home").should("be.visible");
                
                // Close navigation drawer by clicking toggle again
                cy.getBySel("sidenav-toggle").click();
                
                // Navigation should be hidden again
                cy.getBySel("sidenav-home").should("not.be.visible");
            } else {
                // In desktop view, navigation should be visible by default
                cy.getBySel("sidenav-home").should("be.visible");
                cy.getBySel("sidenav-user-settings").should("be.visible");
                cy.getBySel("sidenav-bankaccounts").should("be.visible");
            }
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // Navigate to personal feed
            cy.getBySel("nav-personal-tab").click();
            cy.wait(`@${feedViews.personal.routeAlias}`);
            
            // Verify different transaction types are displayed
            cy.getBySel("transaction-item").should("have.length.greaterThan", 0);
            
            // Verify at least one payment transaction with status "complete"
            cy.getBySel("transaction-item")
                .filter(":contains('charged')")
                .filter(":contains('Complete')")
                .should("have.length.at.least", 1);
            
            // Verify at least one request transaction with status "pending"
            cy.getBySel("transaction-item")
                .filter(":contains('requested')")
                .filter(":contains('Pending')")
                .should("have.length.at.least", 1);
            
            // Check for like and comment UI elements
            cy.getBySel("transaction-item").first().within(() => {
                cy.get("[data-test*='like-button']").should("exist");
                cy.get("[data-test*='comment-button']").should("exist");
            });
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // Navigate to feed tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Get the initial transactions count
                cy.getBySel("transaction-item").its("length").then((initialCount) => {
                    // Scroll to the bottom to load more transactions
                    cy.getBySel("transaction-list").scrollTo("bottom");
                    
                    // Wait for API call to complete
                    cy.wait(`@${feed.routeAlias}`);
                    
                    // Verify more transactions were loaded
                    cy.getBySel("transaction-item")
                        .its("length")
                        .should("be.greaterThan", initialCount);
                });
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                // Navigate to personal feed
                cy.getBySel("nav-personal-tab").click();
                cy.wait(`@${feedViews.personal.routeAlias}`);
                
                // Open date range filter
                cy.getBySel("filter-date-range-button").click();
                
                // Date range picker modal should be visible
                cy.getBySel("date-range-filter-drawer").should("be.visible");
                
                // Close the modal
                cy.getBySel("date-range-filter-drawer-close").click();
                
                // Date range picker modal should be closed
                cy.getBySel("date-range-filter-drawer").should("not.exist");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // Navigate to feed tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Open date range filter
                cy.getBySel("filter-date-range-button").click();
                
                // Select date range (last 10 days)
                const today = new Date();
                const tenDaysAgo = new Date(today);
                tenDaysAgo.setDate(today.getDate() - 10);
                
                // Set start date
                cy.getBySel("date-range-filter-start-date")
                    .clear()
                    .type(tenDaysAgo.toISOString().split('T')[0]);
                
                // Set end date
                cy.getBySel("date-range-filter-end-date")
                    .clear()
                    .type(today.toISOString().split('T')[0]);
                
                // Apply the filter
                cy.getBySel("date-range-filter-apply").click();
                
                // Wait for API call with new filters
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify transactions are filtered
                cy.location("search").should("include", "dateRangeStart");
                cy.getBySel("transaction-item").should("have.length.at.least", 1);
            });
            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // Navigate to feed tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Open date range filter
                cy.getBySel("filter-date-range-button").click();
                
                // Select date range from the distant future
                const futureDate1 = new Date();
                futureDate1.setFullYear(futureDate1.getFullYear() + 1);
                const futureDate2 = new Date(futureDate1);
                futureDate2.setDate(futureDate2.getDate() + 5);
                
                // Set future start date
                cy.getBySel("date-range-filter-start-date")
                    .clear()
                    .type(futureDate1.toISOString().split('T')[0]);
                
                // Set future end date
                cy.getBySel("date-range-filter-end-date")
                    .clear()
                    .type(futureDate2.toISOString().split('T')[0]);
                
                // Apply the filter
                cy.getBySel("date-range-filter-apply").click();
                
                // Wait for API call with new filters
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify no transactions are displayed
                cy.getBySel("empty-list-header").should("be.visible");
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
                // Navigate to feed tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Open amount range filter
                cy.getBySel("filter-amount-range-button").click();
                
                // Set min amount
                cy.getBySel("transaction-list-filter-amount-range-min")
                    .clear()
                    .type(dollarAmountRange.min.toString());
                
                // Set max amount
                cy.getBySel("transaction-list-filter-amount-range-max")
                    .clear()
                    .type(dollarAmountRange.max.toString());
                
                // Apply the filter
                cy.getBySel("filter-amount-range-submit").click();
                
                // Wait for API call with new filters
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify transactions are filtered
                cy.location("search").should("include", "amountMin");
                
                // Verify all displayed transactions are within the amount range
                cy.getBySel("transaction-item").each(($el) => {
                    const amountText = $el.find("[data-test='transaction-amount']").text();
                    const amount = parseFloat(amountText.replace(/[^0-9.-]+/g, ""));
                    expect(amount).to.be.within(dollarAmountRange.min, dollarAmountRange.max);
                });
            });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // Navigate to feed tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Open amount range filter
                cy.getBySel("filter-amount-range-button").click();
                
                // Set a very high amount range that should return no results
                const veryHighAmount = {
                    min: 9000,
                    max: 10000,
                };
                
                // Set min amount
                cy.getBySel("transaction-list-filter-amount-range-min")
                    .clear()
                    .type(veryHighAmount.min.toString());
                
                // Set max amount
                cy.getBySel("transaction-list-filter-amount-range-max")
                    .clear()
                    .type(veryHighAmount.max.toString());
                
                // Apply the filter
                cy.getBySel("filter-amount-range-submit").click();
                
                // Wait for API call with new filters
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify no transactions are displayed
                cy.getBySel("empty-list-header").should("be.visible");
                cy.getBySel("transaction-item").should("not.exist");
            });
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            // Navigate to personal feed
            cy.getBySel("nav-personal-tab").click();
            cy.wait(`@${feedViews.personal.routeAlias}`);
            
            // Get current user's ID
            const userId = ctx.user!.id;
            
            // Verify all transactions involve the current user
            cy.getBySel("transaction-item").each(($el) => {
                // Find sender and receiver details
                const hasUserId = $el.text().includes(userId) || 
                                 $el.data("sender-id") === userId || 
                                 $el.data("receiver-id") === userId;
                                
                // Assert that the current user is part of the transaction
                expect(hasUserId).to.be.true;
            });
        });
        it("first five items belong to contacts in public feed", () => {
            // Get the user's contacts first
            cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
                const contactIds = contacts.map(contact => contact.contactUserId);
                ctx.contactIds = contactIds;
                
                // Navigate to public feed
                cy.getBySel("nav-public-tab").click();
                cy.wait(`@${feedViews.public.routeAlias}`);
                
                // Verify the first 5 transactions (or less if fewer exist) in the public feed
                // A transaction belongs to a contact if the sender or receiver is a contact
                cy.getBySel("transaction-item").then($items => {
                    const numToCheck = Math.min(5, $items.length);
                    for (let i = 0; i < numToCheck; i++) {
                        cy.wrap($items[i]).within(() => {
                            cy.get("[data-test*='sender-']").invoke("data", "test").then(dataTest => {
                                const senderId = dataTest.toString().replace("sender-", "");
                                cy.get("[data-test*='receiver-']").invoke("data", "test").then(dataTest => {
                                    const receiverId = dataTest.toString().replace("receiver-", "");
                                    const belongsToContact = contactIds.includes(senderId) || contactIds.includes(receiverId);
                                    expect(belongsToContact).to.be.true;
                                });
                            });
                        });
                    }
                });
            });
        });
        it("friends feed only shows contact transactions", () => {
            // Get the user's contacts first
            cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
                const contactIds = contacts.map(contact => contact.contactUserId);
                
                // Navigate to contacts feed
                cy.getBySel("nav-contacts-tab").click();
                cy.wait(`@${feedViews.contacts.routeAlias}`);
                
                // Verify all transactions involve a contact
                cy.getBySel("transaction-item").each($el => {
                    cy.wrap($el).within(() => {
                        cy.get("[data-test*='sender-']").invoke("data", "test").then(dataTest => {
                            const senderId = dataTest.toString().replace("sender-", "");
                            cy.get("[data-test*='receiver-']").invoke("data", "test").then(dataTest => {
                                const receiverId = dataTest.toString().replace("receiver-", "");
                                const belongsToContact = contactIds.includes(senderId) || contactIds.includes(receiverId);
                                expect(belongsToContact).to.be.true;
                            });
                        });
                    });
                });
            });
        });
    });
});
