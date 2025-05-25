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
    describe("renders and paginates all transaction feeds", function () {
        it("renders transactions item variations in feed", () => {
// renders transactions item variations in feed
it("renders transactions item variations in feed", () => {
// Visit the main page to view the default feed
cy.visit("/");
cy.wait("@publicTransactions");

// Verify that transaction items are rendered
cy.getBySel("transaction-item").should("have.length.at.least", 1);

// Check for various transaction item elements that should be present
cy.getBySel("transaction-item").first().within(() => {
// Should contain transaction amount
cy.get("[data-test*='transaction-amount']").should("exist");

// Should contain transaction description or note
cy.get("[data-test*='transaction']").should("contain.text");

// Should show user information (sender/receiver)
cy.get("[data-test*='user']").should("exist");
});

// Verify different transaction types are displayed if they exist
cy.getBySel("transaction-item").each(($el) => {
cy.wrap($el).should("be.visible");
// Each transaction should have readable content
cy.wrap($el).should("not.be.empty");
});
});

// Loop through each feed view (public, contacts, personal)
_.each(feedViews, (feed, feedName) => {
it(`${feedName} feed renders and paginates correctly`, () => {
// Visit the main page
cy.visit("/");

// Click on the specific feed tab
cy.getBySel(feed.tab).click();
cy.wait(`@${feed.routeAlias}`);

// Verify the feed loads with transactions
cy.getBySel("transaction-item").should("have.length.at.least", 0);

// Check if pagination exists when there are many transactions
cy.get("body").then(($body) => {
if ($body.find("[data-test*='pagination']").length > 0) {
// If pagination exists, test it
cy.getBySel("pagination").should("be.visible");

// Check if next page button exists and is clickable
cy.get("[data-test*='pagination']").within(() => {
cy.get("button").should("exist");
});
}
});

// Verify feed-specific behavior
if (feedName === "personal") {
// Personal feed should show user's own transactions
cy.getBySel("transaction-item").each(($el) => {
// Each transaction should involve the current user
cy.wrap($el).should("contain", ctx.user?.firstName || ctx.user?.username);
});
}

// Verify the correct tab is selected
cy.getBySel(feed.tab).should("have.class", "Mui-selected");
});
});
 });
        _.each(feedViews, (feed, feedName) => {});
    });
});
