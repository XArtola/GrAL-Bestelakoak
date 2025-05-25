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
// Ensure the user is on a page with a transaction feed.
// The beforeEach handles login. Navigating to /personal ensures a consistent starting point.
cy.visit("/personal");
cy.wait(`@${feedViews.personal.routeAlias}`);

// Click the date range filter button to open the picker/modal.
// This assumes a data-test attribute "date-range-filter" for the button.
cy.getBySel("date-range-filter").click();

// Assert that the date range picker modal is visible.
// This assumes a data-test attribute "date-picker-dialog" for the modal.
cy.getBySel("date-picker-dialog").should("be.visible");

// Click the close/cancel button in the modal.
// This assumes a data-test attribute "date-picker-cancel-button" for this button.
cy.getBySel("date-picker-cancel-button").click();

// Assert that the date range picker modal is no longer visible.
// It might become 'not.be.visible' or 'not.exist' depending on implementation.
cy.getBySel("date-picker-dialog").should("not.exist");
 });
        }
        _.each(feedViews, (feed, feedName) => {});
    });
});
