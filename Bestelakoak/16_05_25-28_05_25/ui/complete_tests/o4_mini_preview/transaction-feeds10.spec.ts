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
    describe("Feed Item Visibility", () => {
        it("first five items belong to contacts in public feed", () => {
// Navigate to the public feed tab
cy.getBySel(feedViews.public.tab).click();
cy.wait(`@${feedViews.public.routeAlias}`);

// Load the current user's contacts from the test database
cy.database("find", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
const contactIds = contacts.map(c => c.contactUserId);

// Ensure at least five transactions are shown
cy.getBySel("transaction-item")
.should("have.length.at.least", 5)
.each(($el, index) => {
if (index < 5) {
// For each of the first five items, grab the sender/receiver test attribute
cy.wrap($el)
.find("[data-test^='transaction-sender-'], [data-test^='transaction-receiver-']")
.invoke("attr", "data-test")
.then(attr => {
const parts = attr!.split("-");
const userId = parts[2];
// Assert that this transaction involves one of the user's contacts
expect(contactIds).to.include(userId);
});
}
});
});
 });
    });
});
