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
// it block: renders transactions item variations in feed
<generated_code>
// Verify that transaction items are displayed correctly in the feed
cy.visit("/");
cy.wait("@publicTransactions");

// Ensure the public feed tab is active
cy.getBySel(feedViews.public.tab).should("have.class", "Mui-selected");

// Verify that transaction items are visible
cy.getBySel("transaction-item").should("have.length.at.least", 1);

// Check that each transaction item has the expected structure
cy.getBySel("transaction-item").each(($el) => {
    cy.wrap($el).within(() => {
        cy.get("[data-test='transaction-sender']").should("exist");
        cy.get("[data-test='transaction-receiver']").should("exist");
        cy.get("[data-test='transaction-amount']").should("exist");
    });
});
</generated_code>

// it block: _.each(feedViews, (feed, feedName) => {})
<generated_code>
// Iterate through each feed view and verify its functionality
_.each(feedViews, (feed, feedName) => {
    it(`renders and paginates ${feedName} feed`, () => {
        // Navigate to the feed tab
        cy.getBySel(feed.tab).click();
        cy.wait(`@${feed.routeAlias}`);

        // Verify that the feed tab is active
        cy.getBySel(feed.tab).should("have.class", "Mui-selected");

        // Ensure transactions are loaded
        cy.getBySel("transaction-item").should("have.length.at.least", 1);

        // Check pagination functionality if applicable
        cy.get("body").then(($body) => {
            if ($body.find("[data-test='pagination-next']").length > 0) {
                cy.get("[data-test='pagination-next']").click();
                cy.wait(`@${feed.routeAlias}`);
                cy.getBySel("transaction-item").should("have.length.at.least", 1);
            }
        });
    });
});
</generated_code>
 });
        _.each(feedViews, (feed, feedName) => {});
    });
});
