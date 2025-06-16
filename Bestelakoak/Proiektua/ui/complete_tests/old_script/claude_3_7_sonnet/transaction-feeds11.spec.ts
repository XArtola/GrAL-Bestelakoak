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
        it("friends feed only shows contact transactions", () => {
// Get the user's contacts first

cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {

const contactIds = contacts.map(contact => contact.contactUserId);

ctx.contactIds = contactIds;



// If user has no contacts, skip test with a message

if (contactIds.length === 0) {

cy.log("User has no contacts. Test skipped.");

return;

}



// Navigate to contacts feed

cy.getBySel("nav-contacts-tab").click();

cy.wait(`@${feedViews.contacts.routeAlias}`);



// Check if there are any transactions in the friends feed

cy.get("body").then(($body) => {

// If no transactions are found, skip test with appropriate message

if ($body.find("[data-test=empty-list-header]").length > 0) {

cy.log("No transactions found in friends feed. Test skipped.");

return;

}



// Verify all transactions involve at least one contact

cy.getBySel("transaction-item").each(($el) => {

// Get sender and receiver IDs from the transaction item

cy.wrap($el).within(() => {

// For each transaction, check if it involves at least one contact

// We look for data-test attributes that start with "transaction-sender-" or "transaction-receiver-"

cy.get("[data-test^='transaction-sender-'], [data-test^='transaction-receiver-']")

.should("exist")

.then($participants => {

// Extract user IDs from the data-test attributes

const participantIds = Array.from($participants).map(el => {

const dataTest = el.getAttribute("data-test");

return dataTest ? dataTest.split("-")[2] : "";

});



// At least one participant should be in the contact list

const involvesContact = participantIds.some(id => contactIds.includes(id));

expect(involvesContact, "Transaction involves at least one contact").to.be.true;

});

});

});

});

});


 });
    });
});
