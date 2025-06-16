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
// Get user's contacts first to establish contact IDs

cy.database("find", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {

const contactIds = contacts.map(contact => contact.contactUserId);

ctx.contactIds = contactIds;



// Navigate to public feed

cy.getBySel("nav-public-tab").click();

cy.wait(`@${feedViews.public.routeAlias}`);



// Ensure transactions are loaded

cy.getBySel("transaction-item").should("have.length.at.least", 1);



// Check first 5 transactions (or less if fewer exist)

cy.getBySel("transaction-item").then($items => {

const numToCheck = Math.min(5, $items.length);



for (let i = 0; i < numToCheck; i++) {

cy.wrap($items[i]).within(() => {

// Check if either sender or receiver is in user's contacts

cy.get("[data-test^='transaction-sender-'], [data-test^='transaction-receiver-']")

.invoke("attr", "data-test")

.then(dataTest => {

const userId = dataTest!.split("-")[2];

const isContact = contactIds.includes(userId);

expect(isContact, `Transaction ${i + 1} should involve a contact`).to.be.true;

});

});

}

});

});


 });
    });
});
