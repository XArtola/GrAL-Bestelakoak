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
    describe("filters transaction feeds by date range", function () {
        if (isMobile()) {
            it("closes date range picker modal", () => {
// it block: "closes date range picker modal"
<generated_code>
// Test to verify that the date range picker modal closes on mobile devices
it("closes date range picker modal", () => {
    // Open the date range picker
    cy.getBySel("date-range-picker").click();

    // Verify that the modal is visible
    cy.getBySel("date-range-modal").should("be.visible");

    // Close the modal
    cy.getBySel("date-range-close-button").click();

    // Verify that the modal is no longer visible
    cy.getBySel("date-range-modal").should("not.exist");
});
</generated_code>

// it block: "filters transaction feeds by date range"
<generated_code>
// Test to verify that transaction feeds can be filtered by date range
_.each(feedViews, (feed, feedName) => {
    it(`filters ${feedName} transaction feed by date range`, () => {
        // Navigate to the specific feed tab
        cy.getBySel(feed.tab).click();
        cy.wait(`@${feed.routeAlias}`);

        // Open the date range picker
        cy.getBySel("date-range-picker").click();

        // Set the start and end dates for the filter
        cy.getBySel("date-range-start").type("2023-01-01");
        cy.getBySel("date-range-end").type("2023-12-31");

        // Apply the date range filter
        cy.getBySel("date-range-apply").click();

        // Verify that the transactions displayed fall within the selected date range
        cy.getBySel("transaction-item").each(($item) => {
            cy.wrap($item)
                .find("[data-test='transaction-date']")
                .invoke("text")
                .then((dateText) => {
                    const transactionDate = new Date(dateText);
                    const startDate = new Date("2023-01-01");
                    const endDate = new Date("2023-12-31");
                    expect(transactionDate).to.be.within(startDate, endDate);
                });
        });
    });
});
</generated_code>
 });
        }
        _.each(feedViews, (feed, feedName) => {});
    });
});
