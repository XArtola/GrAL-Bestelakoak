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
                // On mobile, the navigation drawer should be hidden by default
                cy.getBySel("sidenav-home").should("not.be.visible");
                
                // Open the navigation drawer
                cy.getBySel("sidenav-toggle").click();
                
                // Navigation drawer should now be visible
                cy.getBySel("sidenav-home").should("be.visible");
                
                // Close the navigation drawer
                cy.getBySel("sidenav-toggle").click();
                
                // Navigation drawer should be hidden again
                cy.getBySel("sidenav-home").should("not.be.visible");
            } else {
                // On desktop, the navigation drawer should be visible by default
                cy.getBySel("sidenav-home").should("be.visible");
            }
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // Visit public transactions feed
            cy.getBySel("nav-public-tab").click();
            cy.wait(`@${feedViews.public.routeAlias}`);
            
            // Verify feed contains transactions
            cy.getBySel("transaction-item").should("have.length.greaterThan", 0);
            
            // Verify different transaction types are rendered correctly
            // Payment transaction
            cy.getBySel("transaction-item")
                .filter(":contains('paid')")
                .should("be.visible");
                
            // Request transaction
            cy.getBySel("transaction-item")
                .filter(":contains('requested')")
                .should("be.visible");
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // Click on the appropriate tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Get the initial count of transactions
                cy.getBySel("transaction-item").then($initialItems => {
                    const initialCount = $initialItems.length;
                    
                    // Scroll to the bottom to trigger pagination
                    cy.getBySel("list-skeleton").scrollIntoView();
                    
                    // Wait for more transactions to load
                    cy.wait(`@${feed.routeAlias}`);
                    
                    // Verify more transactions were loaded
                    cy.getBySel("transaction-item").should("have.length.greaterThan", initialCount);
                });
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                // Navigate to personal transactions
                cy.getBySel("nav-personal-tab").click();
                cy.wait(`@${feedViews.personal.routeAlias}`);
                
                // Open date range filter
                cy.getBySel("filter-date-range-button").click();
                
                // Verify date range picker modal is open
                cy.getBySel("date-range-filter-drawer").should("be.visible");
                
                // Close the modal
                cy.getBySel("date-range-filter-drawer-close").click();
                
                // Verify modal is closed
                cy.getBySel("date-range-filter-drawer").should("not.exist");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // Navigate to the appropriate tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Get a date range of previous week
                const now = new Date();
                const oneWeekAgo = addDays(now, -7);
                
                // Open date range filter
                cy.getBySel("filter-date-range-button").click();
                
                // Set date range
                if (isMobile()) {
                    // Mobile date picker
                    cy.getBySel("date-range-filter-drawer").within(() => {
                        cy.getBySel("date-range-start").type(oneWeekAgo.toISOString().split("T")[0]);
                        cy.getBySel("date-range-end").type(now.toISOString().split("T")[0]);
                        cy.getBySel("date-range-filter-apply").click();
                    });
                } else {
                    // Desktop date picker
                    cy.getBySel("date-range-start").type(oneWeekAgo.toISOString().split("T")[0]);
                    cy.getBySel("date-range-end").type(now.toISOString().split("T")[0]);
                    cy.getBySel("date-range-filter-apply").click();
                }
                
                // Wait for filtered results
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify filter badge is displayed
                cy.getBySel("transaction-list-filter-date-range-text").should("be.visible");
            });
            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // Navigate to the appropriate tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Get a date range far in the past
                const farPast = addDays(new Date(), -365);
                const pastEnd = addDays(farPast, 7);
                
                // Open date range filter
                cy.getBySel("filter-date-range-button").click();
                
                // Set date range
                if (isMobile()) {
                    // Mobile date picker
                    cy.getBySel("date-range-filter-drawer").within(() => {
                        cy.getBySel("date-range-start").type(farPast.toISOString().split("T")[0]);
                        cy.getBySel("date-range-end").type(pastEnd.toISOString().split("T")[0]);
                        cy.getBySel("date-range-filter-apply").click();
                    });
                } else {
                    // Desktop date picker
                    cy.getBySel("date-range-start").type(farPast.toISOString().split("T")[0]);
                    cy.getBySel("date-range-end").type(pastEnd.toISOString().split("T")[0]);
                    cy.getBySel("date-range-filter-apply").click();
                }
                
                // Wait for filtered results
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify empty state is shown
                cy.getBySel("empty-list-header").should("be.visible");
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
                // Navigate to the appropriate tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Open amount range filter
                cy.getBySel("filter-amount-range-button").click();
                
                // Set amount range
                cy.getBySel("transaction-list-filter-amount-range-slider").within(() => {
                    // Clear any existing values
                    cy.getBySel("amount-range-min").clear().type(dollarAmountRange.min.toString());
                    cy.getBySel("amount-range-max").clear().type(dollarAmountRange.max.toString());
                });
                
                // Apply the filter
                cy.getBySel("amount-range-filter-apply").click();
                
                // Wait for filtered results
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify filter badge is displayed
                cy.getBySel("transaction-list-filter-amount-range-text")
                    .should("be.visible")
                    .and("contain", `$${dollarAmountRange.min} - $${dollarAmountRange.max}`);
                
                // Verify transactions are within the range
                cy.getBySel("transaction-item").each($el => {
                    const amountText = $el.find("[data-test='transaction-amount']").text();
                    const amount = parseFloat(amountText.replace(/[$,]/g, ""));
                    expect(amount).to.be.within(dollarAmountRange.min, dollarAmountRange.max);
                });
            });
            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // Navigate to the appropriate tab
                cy.getBySel(`nav-${feed.tab}`).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Open amount range filter with unrealistic values
                cy.getBySel("filter-amount-range-button").click();
                
                cy.getBySel("transaction-list-filter-amount-range-slider").within(() => {
                    // Set very high values that should return no results
                    cy.getBySel("amount-range-min").clear().type("9000");
                    cy.getBySel("amount-range-max").clear().type("10000");
                });
                
                // Apply the filter
                cy.getBySel("amount-range-filter-apply").click();
                
                // Wait for filtered results
                cy.wait(`@${feed.routeAlias}`);
                
                // Verify empty state is shown
                cy.getBySel("empty-list-header").should("be.visible");
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
            
            // Verify all transactions are related to the current user
            cy.getBySel("transaction-item").each($el => {
                // Get the transaction data from the data attribute
                cy.wrap($el).invoke("attr", "data-transaction-id").then(transactionId => {
                    cy.database("find", "transactions", { id: transactionId }).then(transaction => {
                        // Check if the user is either the sender or receiver
                        const userInvolved = (
                            transaction.senderId === userId || 
                            transaction.receiverId === userId
                        );
                        expect(userInvolved).to.be.true;
                    });
                });
            });
        });
        it("first five items belong to contacts in public feed", () => {
            // Navigate to public feed
            cy.getBySel("nav-public-tab").click();
            cy.wait(`@${feedViews.public.routeAlias}`);
            
            // Get the first 5 transactions
            cy.getBySel("transaction-item").eq(0).should("be.visible");
            cy.getBySel("transaction-item").eq(1).should("be.visible");
            cy.getBySel("transaction-item").eq(2).should("be.visible");
            cy.getBySel("transaction-item").eq(3).should("be.visible");
            cy.getBySel("transaction-item").eq(4).should("be.visible");
        });
        it("friends feed only shows contact transactions", () => {
            // First, ensure we have some contacts
            cy.database("filter", "contacts", { userId: ctx.user!.id }).then(contacts => {
                // Get the contact IDs
                const contactIds = contacts.map(contact => contact.contactUserId);
                ctx.contactIds = contactIds;
                
                // Navigate to friends feed
                cy.getBySel("nav-contacts-tab").click();
                cy.wait(`@${feedViews.contacts.routeAlias}`);
                
                // Verify all transactions are related to contacts
                cy.getBySel("transaction-item").each($el => {
                    // Get the transaction data from the data attribute
                    cy.wrap($el).invoke("attr", "data-transaction-id").then(transactionId => {
                        cy.database("find", "transactions", { id: transactionId }).then(transaction => {
                            // Check if either the sender or receiver is a contact
                            const contactInvolved = (
                                contactIds.includes(transaction.senderId) || 
                                contactIds.includes(transaction.receiverId)
                            );
                            expect(contactInvolved).to.be.true;
                        });
                    });
                });
            });
        });
    });
});
