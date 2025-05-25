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
it("friends feed only shows contact transactions", () => {

// Navigate to the friends feed

cy.getBySel(feedViews.contacts.tab).click();

cy.wait(`@${feedViews.contacts.routeAlias}`);



// Fetch the user's contacts from the database

cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {

const contactIds = contacts.map(contact => contact.contactUserId);

ctx.contactIds = contactIds;



// Ensure transactions are loaded

cy.getBySel("transaction-item").should("have.length.at.least", 1);



// Verify that each transaction involves a contact

cy.getBySel("transaction-item").each(($el) => {

const senderId = $el.find("[data-test^='transaction-sender-']").attr("data-test")?.split("-")[2];

const receiverId = $el.find("[data-test^='transaction-receiver-']").attr("data-test")?.split("-")[2];



// Assert that either the sender or receiver is a contact

const isContactTransaction = contactIds.includes(senderId!) || contactIds.includes(receiverId!);

expect(isContactTransaction).to.be.true;

});

});

});
 });
    });
});
