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
        it('friends feed only shows contact transactions', () => {
    // friends feed only shows contact transactions
    // This test verifies that the "friends" feed only displays transactions involving the user's contacts.

    cy.getBySel(feedViews.contacts.tab).click(); // Click on the "friends" tab
    cy.wait(`@${feedViews.contacts.routeAlias}`); // Wait for the contacts transactions API call

    // Get all transaction items in the feed
    cy.getBySelLike("transaction-item").each(($el) => {
      // For each transaction, check that the sender or receiver is in the user's contacts
      cy.wrap($el)
        .invoke("attr", "data-test-transaction-id")
        .then((transactionId) => {
          // Fetch transaction details from the backend via Cypress task or API if needed
          // Here, we assume the UI displays the contact's name or username in the transaction item
          cy.wrap($el)
            .find('[data-test="transaction-participant"]')
            .invoke("text")
            .then((participantText) => {
              // The participant should be one of the user's contacts
              // ctx.user is the logged-in user, ctx.allUsers contains all users
              // Find the contact IDs for the user
              cy.task("getContactsByUserId", ctx.user.id).then((contacts: Contact[]) => {
                const contactUserIds = contacts.map((c) => c.contactUserId);
                // The participantText should match one of the contact users' names or usernames
                const contactUsers = ctx.allUsers.filter((u) => contactUserIds.includes(u.id));
                const matchesContact = contactUsers.some(
                  (u) =>
                    participantText.includes(u.firstName) ||
                    participantText.includes(u.lastName) ||
                    participantText.includes(u.username)
                );
                expect(matchesContact, "transaction is with a contact").to.be.true;
              });
            });
        });
    });
  });
    });
});
