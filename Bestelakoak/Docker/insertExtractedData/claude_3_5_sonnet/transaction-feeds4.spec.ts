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
// Skip if not mobile view

if (!isMobile()) {

return;

}



// Visit the transactions page

cy.visit("/");

cy.wait("@publicTransactions");



// Open date range picker

cy.getBySel("filter-date-range-button").click();

cy.getBySel("date-range-filter-drawer").should("be.visible");



// Close the modal

cy.getBySel("date-range-filter-drawer-close").click();

cy.getBySel("date-range-filter-drawer").should("not.exist");

});



// For each feed view (public, contacts, personal)

_.each(feedViews, (feed, feedName) => {

it(`filters ${feedName} transaction feed by date range`, () => {

// Visit the appropriate feed page

cy.visit("/");

cy.getBySel(feed.tab).click();

cy.wait(`@${feed.routeAlias}`);



// Set up test date range (last 7 days)

const endDate = new Date();

const startDate = addDays(endDate, -7);



// Open date range filter

cy.getBySel("filter-date-range-button").click();



// Enter date range

cy.getBySelLike("filter-date-range-start").type(

startDate.toISOString().split("T")[0]

);

cy.getBySelLike("filter-date-range-end").type(

endDate.toISOString().split("T")[0]

);



// Apply filter

cy.getBySel("filter-date-range-apply-button").click();



// Verify filtered results

cy.get("[data-test=transaction-item]").each(($el) => {

cy.wrap($el).find("[data-test=transaction-created-date]")

.invoke("attr", "datetime")

.then((dateStr) => {

const transactionDate = new Date(dateStr);

const isWithinRange = isWithinInterval(transactionDate, {

start: startOfDayUTC(startDate),

end: endOfDayUTC(endDate)

});

expect(isWithinRange).to.be.true;

});

});

});


 });
        }
        _.each(feedViews, (feed, feedName) => {});
    });
});
