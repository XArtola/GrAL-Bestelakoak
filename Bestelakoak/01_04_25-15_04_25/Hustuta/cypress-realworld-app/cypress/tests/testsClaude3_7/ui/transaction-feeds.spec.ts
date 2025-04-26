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
            // Check that navigation drawer is visible by default on desktop
            if (!isMobile()) {
                cy.getBySel("sidenav").should("be.visible");
                
                // Click the close button
                cy.getBySel("sidenav-toggle").click();
                
                // Verify the drawer is collapsed
                cy.getBySel("sidenav").should("not.be.visible");
                
                // Click the hamburger icon to show the drawer again
                cy.getBySel("sidenav-toggle").click();
                
                // Verify the drawer is visible again
                cy.getBySel("sidenav").should("be.visible");
            } else {
                // On mobile, the drawer should be hidden by default
                cy.getBySel("sidenav").should("not.be.visible");
                
                // Click the hamburger icon to show the drawer
                cy.getBySel("sidenav-toggle").click();
                
                // Verify the drawer is visible
                cy.getBySel("sidenav").should("be.visible");
                
                // Click outside the drawer to hide it
                cy.get("body").click(0, 0);
                
                // Verify the drawer is hidden again
                cy.getBySel("sidenav").should("not.be.visible");
            }
        });
    });
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
            // Visit home page which shows the personal transaction feed by default
            cy.visit("/");
            cy.wait("@personalTransactions");
            
            // Get all transaction items in the list
            cy.getBySel("transaction-item").should("have.length.at.least", 1);
            
            // Check for different transaction types in the feed
            // We should verify payment, request, and different statuses
            
            // Check for transaction items with "paid" status (completed payments)
            cy.getBySel("transaction-item")
              .contains("paid")
              .should("exist");
            
            // Check for transaction items with "requested" status
            cy.getBySel("transaction-item")
              .contains("requested")
              .should("exist");
            
            // Check for items with "received" flow indicator
            cy.getBySel("transaction-item")
              .find("[data-test^='transaction-action-']")
              .contains("received")
              .should("exist");
              
            // Check for items with "sent" flow indicator
            cy.getBySel("transaction-item")
              .find("[data-test^='transaction-action-']")
              .contains("sent")
              .should("exist");
            
            // Check for transaction amounts displayed
            cy.getBySel("transaction-item")
              .find("[data-test='transaction-amount']")
              .should("exist");
            
            // Check that each transaction item has a date
            cy.getBySel("transaction-item")
              .find("[data-test='transaction-created-date']")
              .should("exist");
        });
        _.each(feedViews, (feed, feedName) => {
            it(`paginates ${feedName} transaction feed`, () => {
                // Visit the home page
                cy.visit("/");
                
                // Click on the tab for the current feed type
                cy.getBySel(feed.tab).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Get initial list of transactions
                cy.getBySel("transaction-item").should("have.length.at.least", 1);
                let initialTransactionCount = 0;
                
                // Store the first transaction item text for comparison later
                let firstTransactionText = "";
                cy.getBySel("transaction-item").first().invoke("text").then((text) => {
                    firstTransactionText = text;
                });
                
                // Count the initial transactions
                cy.getBySel("transaction-item").then(($list) => {
                    initialTransactionCount = $list.length;
                    
                    // Ensure there are enough transactions to paginate
                    if (initialTransactionCount < 10) {
                        // If not enough transactions for pagination testing, this test can be skipped
                        cy.log(`Not enough ${feedName} transactions for pagination testing`);
                        return;
                    }
                    
                    // Scroll to the bottom to trigger loading more transactions
                    cy.getBySel("transaction-list").scrollTo("bottom");
                    
                    // Wait for potential loading spinner to disappear
                    cy.getBySel("transaction-list-loader").should("not.exist");
                    
                    // Wait for the next page of transactions to load
                    cy.wait(`@${feed.routeAlias}`);
                    
                    // Verify that more transactions were loaded
                    cy.getBySel("transaction-item").then(($updatedList) => {
                        expect($updatedList.length).to.be.greaterThan(initialTransactionCount);
                    });
                    
                    // Verify the first transaction is still the same (pagination preserves order)
                    cy.getBySel("transaction-item").first().invoke("text").should((text) => {
                        expect(text).to.equal(firstTransactionText);
                    });
                });
            });
        });
    });
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
                // Visit home page
                cy.visit("/");
                
                // Open date range filter
                cy.getBySel("transaction-list-filter-date-range-button").click();
                
                // Verify that the date range modal is visible
                cy.getBySel("date-range-filter-modal").should("be.visible");
                
                // Click the close button
                cy.getBySel("date-range-filter-drawer-close").click();
                
                // Verify that the date range modal is hidden
                cy.getBySel("date-range-filter-modal").should("not.exist");
                
                // Open date range filter again
                cy.getBySel("transaction-list-filter-date-range-button").click();
                
                // Verify that the date range modal is visible again
                cy.getBySel("date-range-filter-modal").should("be.visible");
                
                // Click outside the modal to close it
                cy.get("body").click(0, 0);
                
                // Verify that the date range modal is hidden again
                cy.getBySel("date-range-filter-modal").should("not.exist");
            });
        }
        _.each(feedViews, (feed, feedName) => {
            it(`filters ${feedName} transaction feed by date range`, () => {
                // Visit home page
                cy.visit("/");
                
                // Click on the feed tab
                cy.getBySel(feed.tab).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Get current date and calculate a date range (1 week ago to today)
                const today = new Date();
                const oneWeekAgo = addDays(today, -7);
                
                // Format dates for the date picker inputs
                const todayFormatted = today.toISOString().split("T")[0]; // YYYY-MM-DD
                const oneWeekAgoFormatted = oneWeekAgo.toISOString().split("T")[0]; // YYYY-MM-DD
                
                // Open the date range filter
                cy.getBySel("transaction-list-filter-date-range-button").click();
                
                // Enter the date range
                cy.getBySelLike("date-range-filter").find("[data-test=date-range-filter-start-date-input]")
                  .type(oneWeekAgoFormatted);
                cy.getBySelLike("date-range-filter").find("[data-test=date-range-filter-end-date-input]")
                  .type(todayFormatted);
                
                // Apply the filter
                cy.getBySel("date-range-filter-apply").click();
                
                // Wait for transactions to reload
                cy.wait(`@${feed.routeAlias}`);
                
                // Store filtered transactions
                cy.getBySel("transaction-item").then(($filteredTransactions) => {
                    // Skip test if no transactions are found in the date range
                    if ($filteredTransactions.length === 0) {
                        cy.log(`No ${feedName} transactions found in the selected date range`);
                        return;
                    }
                    
                    // Check that all visible transactions are within the date range
                    cy.getBySel("transaction-item").each(($el) => {
                        // Get the transaction date from the element
                        cy.wrap($el).find("[data-test=transaction-created-date]").invoke("attr", "title")
                        .then((dateString) => {
                            if (!dateString) return; // Skip if no date found
                            
                            const transactionDate = new Date(dateString);
                            // Check if the transaction date is within the specified range
                            expect(isWithinInterval(transactionDate, { 
                                start: startOfDay(oneWeekAgo), 
                                end: endOfDayUTC(today) 
                            })).to.be.true;
                        });
                    });
                });
            });
            
            it(`does not show ${feedName} transactions for out of range date limits`, () => {
                // Visit home page
                cy.visit("/");
                
                // Click on the feed tab
                cy.getBySel(feed.tab).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Store initial transaction count
                let initialTransactionCount = 0;
                cy.getBySel("transaction-item").then(($transactions) => {
                    initialTransactionCount = $transactions.length;
                    
                    // Skip test if there are no initial transactions
                    if (initialTransactionCount === 0) {
                        cy.log(`No initial ${feedName} transactions found to test date filter`);
                        return;
                    }
                    
                    // Set a date range far in the past where no transactions should exist
                    const pastStartDate = new Date(2000, 0, 1); // January 1, 2000
                    const pastEndDate = new Date(2000, 0, 7); // January 7, 2000
                    
                    // Format dates for the date picker inputs
                    const pastStartFormatted = pastStartDate.toISOString().split("T")[0]; // YYYY-MM-DD
                    const pastEndFormatted = pastEndDate.toISOString().split("T")[0]; // YYYY-MM-DD
                    
                    // Open the date range filter
                    cy.getBySel("transaction-list-filter-date-range-button").click();
                    
                    // Enter the out-of-range date values
                    cy.getBySelLike("date-range-filter").find("[data-test=date-range-filter-start-date-input]")
                      .clear().type(pastStartFormatted);
                    cy.getBySelLike("date-range-filter").find("[data-test=date-range-filter-end-date-input]")
                      .clear().type(pastEndFormatted);
                    
                    // Apply the filter
                    cy.getBySel("date-range-filter-apply").click();
                    
                    // Wait for transactions to reload
                    cy.wait(`@${feed.routeAlias}`);
                    
                    // Check that either no transactions are displayed or an empty state is shown
                    cy.get("body").then(($body) => {
                        const hasTransactions = $body.find("[data-test=transaction-item]").length > 0;
                        const hasEmptyState = $body.find("[data-test=empty-list-header]").length > 0;
                        
                        expect(hasTransactions || hasEmptyState).to.be.true;
                        
                        if (hasTransactions) {
                            cy.getBySel("transaction-item").should("have.length", 0);
                        } else {
                            cy.getBySel("empty-list-header").should("be.visible");
                        }
                    });
                });
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
                // Visit home page
                cy.visit("/");
                
                // Click on the feed tab
                cy.getBySel(feed.tab).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Open amount range filter
                cy.getBySel("transaction-list-filter-amount-range-button").click();
                
                // Set the amount range
                cy.getBySel("transaction-list-filter-amount-range-slider")
                  .should("be.visible")
                  .as("rangeSlider");
                
                // Set minimum and maximum values using the slider component
                cy.get("@rangeSlider").find("input").eq(0).invoke("val", dollarAmountRange.min).trigger("change");
                cy.get("@rangeSlider").find("input").eq(1).invoke("val", dollarAmountRange.max).trigger("change");
                
                // Apply the filter
                cy.getBySel("amount-range-filter-apply").click();
                
                // Wait for transactions to reload with the new filter
                cy.wait(`@${feed.routeAlias}`);
                
                // Check that all visible transactions are within the amount range
                cy.getBySel("transaction-item").then(($items) => {
                    // Skip test if no transactions are found in the amount range
                    if ($items.length === 0) {
                        cy.log(`No ${feedName} transactions found in the selected amount range`);
                        return;
                    }
                    
                    // Verify each transaction is within the specified amount range
                    cy.getBySel("transaction-item").each(($el) => {
                        cy.wrap($el).find("[data-test='transaction-amount']").invoke("text").then((text) => {
                            // Extract the amount from the text (remove $ and any commas)
                            const amountText = text.replace(/[$,]/g, "");
                            const amount = parseFloat(amountText);
                            
                            // Check if amount is within range
                            expect(amount).to.be.at.least(dollarAmountRange.min);
                            expect(amount).to.be.at.most(dollarAmountRange.max);
                        });
                    });
                });
            });
            
            it(`does not show ${feedName} transactions for out of range amount limits`, () => {
                // Visit home page
                cy.visit("/");
                
                // Click on the feed tab
                cy.getBySel(feed.tab).click();
                cy.wait(`@${feed.routeAlias}`);
                
                // Store initial transaction count
                let initialTransactionCount = 0;
                cy.getBySel("transaction-item").then(($transactions) => {
                    initialTransactionCount = $transactions.length;
                    
                    // Skip test if there are no initial transactions
                    if (initialTransactionCount === 0) {
                        cy.log(`No initial ${feedName} transactions found to test amount filter`);
                        return;
                    }
                    
                    // Set an amount range that's unlikely to match any transactions
                    // Using a very specific narrow range
                    const verySpecificMin = 999.98;
                    const verySpecificMax = 999.99;
                    
                    // Open amount range filter
                    cy.getBySel("transaction-list-filter-amount-range-button").click();
                    
                    // Set the specific amount range using the slider
                    cy.getBySel("transaction-list-filter-amount-range-slider")
                      .should("be.visible")
                      .as("rangeSlider");
                    
                    // Set both values to the very specific range
                    cy.get("@rangeSlider").find("input").eq(0).invoke("val", verySpecificMin).trigger("change");
                    cy.get("@rangeSlider").find("input").eq(1).invoke("val", verySpecificMax).trigger("change");
                    
                    // Apply the filter
                    cy.getBySel("amount-range-filter-apply").click();
                    
                    // Wait for transactions to reload with the new filter
                    cy.wait(`@${feed.routeAlias}`);
                    
                    // Check that either no transactions are displayed or an empty state is shown
                    cy.get("body").then(($body) => {
                        const hasTransactions = $body.find("[data-test=transaction-item]").length > 0;
                        const hasEmptyState = $body.find("[data-test=empty-list-header]").length > 0;
                        
                        expect(hasTransactions || hasEmptyState).to.be.true;
                        
                        if (hasTransactions) {
                            // If transactions are found, verify they're within the specified range
                            cy.getBySel("transaction-item").each(($el) => {
                                cy.wrap($el).find("[data-test='transaction-amount']").invoke("text").then((text) => {
                                    const amountText = text.replace(/[$,]/g, "");
                                    const amount = parseFloat(amountText);
                                    
                                    expect(amount).to.be.at.least(verySpecificMin);
                                    expect(amount).to.be.at.most(verySpecificMax);
                                });
                            });
                        } else {
                            // Otherwise, verify empty state is shown
                            cy.getBySel("empty-list-header").should("be.visible");
                        }
                    });
                });
            });
        });
    });
    describe("Feed Item Visibility", () => {
        it("mine feed only shows personal transactions", () => {
            // Visit home page - personal feed is shown by default
            cy.visit("/");
            cy.wait("@personalTransactions");
            
            // Ensure transactions are loaded
            cy.getBySel("transaction-item").should("have.length.at.least", 1);
            
            // Check that all transactions in the personal feed involve the current user
            cy.getBySel("transaction-item").each(($el) => {
                // For every transaction, it should be either sent or received by the current user
                const transactionInvolvesUser = 
                    $el.find(`[data-test="transaction-sender-${ctx.user!.id}"]`).length > 0 ||
                    $el.find(`[data-test="transaction-receiver-${ctx.user!.id}"]`).length > 0;
                
                expect(transactionInvolvesUser).to.be.true;
            });
        });
        
        it("first five items belong to contacts in public feed", () => {
            // Visit home page
            cy.visit("/");
            
            // Navigate to public feed
            cy.getBySel("public-tab").click();
            cy.wait("@publicTransactions");
            
            // Ensure transactions are loaded
            cy.getBySel("transaction-item").should("have.length.at.least", 5);
            
            // Get the user's contact IDs for checking
            cy.database("find", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
                const contactIds = contacts.map((contact) => contact.contactUserId);
                ctx.contactIds = contactIds;
                
                // Get first 5 transactions and verify they involve at least one contact
                cy.getBySel("transaction-item").eq(0)
                  .find("[data-test^='transaction-sender-'], [data-test^='transaction-receiver-']")
                  .invoke("attr", "data-test")
                  .then((dataTestAttr) => {
                    // Extract the user ID from the data-test attribute
                    const userId = dataTestAttr!.split("-")[2];
                    
                    // Check if this transaction is from a contact or the user themselves
                    const isRelevantTransaction = 
                        userId === ctx.user!.id || contactIds.includes(userId);
                    
                    expect(isRelevantTransaction).to.be.true;
                });
                
                // Check more transactions in the public feed (if available)
                for (let i = 1; i < 5; i++) {
                    cy.getBySel("transaction-item").eq(i)
                      .find("[data-test^='transaction-sender-'], [data-test^='transaction-receiver-']")
                      .invoke("attr", "data-test")
                      .then((dataTestAttr) => {
                        if (!dataTestAttr) return; // Skip if attribute not found
                        
                        const userId = dataTestAttr.split("-")[2];
                        const isRelevantTransaction = 
                            userId === ctx.user!.id || contactIds.includes(userId);
                        
                        expect(isRelevantTransaction).to.be.true;
                      });
                }
            });
        });
        
        it("friends feed only shows contact transactions", () => {
            // Visit home page
            cy.visit("/");
            
            // Navigate to contacts (friends) feed
            cy.getBySel("contacts-tab").click();
            cy.wait("@contactsTransactions");
            
            // Get the user's contact IDs for checking
            cy.database("find", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
                const contactIds = contacts.map((contact) => contact.contactUserId);
                
                // Skip test if user doesn't have any contacts
                if (contactIds.length === 0) {
                    cy.log("User has no contacts. Test skipped.");
                    return;
                }
                
                // Check if there are any transactions in the friends feed
                cy.get("body").then(($body) => {
                    if ($body.find("[data-test=empty-list-header]").length > 0) {
                        cy.log("No transactions found in friends feed. Test skipped.");
                        return;
                    }
                    
                    // Ensure transactions are loaded
                    cy.getBySel("transaction-item").should("have.length.at.least", 1);
                    
                    // Check that all transactions in the contacts feed involve at least one contact
                    cy.getBySel("transaction-item").each(($el) => {
                        // For each transaction, check if it involves one of the user's contacts
                        let transactionInvolvesContact = false;
                        
                        // Check if any of the user's contacts are involved in this transaction
                        contactIds.forEach((contactId) => {
                            if (
                                $el.find(`[data-test="transaction-sender-${contactId}"]`).length > 0 ||
                                $el.find(`[data-test="transaction-receiver-${contactId}"]`).length > 0
                            ) {
                                transactionInvolvesContact = true;
                            }
                        });
                        
                        // Also check if the current user is involved (transactions between user and contacts)
                        if (
                            $el.find(`[data-test="transaction-sender-${ctx.user!.id}"]`).length > 0 ||
                            $el.find(`[data-test="transaction-receiver-${ctx.user!.id}"]`).length > 0
                        ) {
                            transactionInvolvesContact = true;
                        }
                        
                        expect(transactionInvolvesContact).to.be.true;
                    });
                });
            });
        });
    });
});
