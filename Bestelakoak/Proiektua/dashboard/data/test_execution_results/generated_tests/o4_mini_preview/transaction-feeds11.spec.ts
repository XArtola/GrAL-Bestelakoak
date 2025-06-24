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
// friends feed only shows contact transactions
// 1. Visit the app and switch to the “friends” (contacts) feed
cy.visit('/');
cy.getBySel(feedViews.contacts.tab).click();
cy.wait('@contactsTransactions');

// 2. Load the current user’s contacts from the test DB
cy.database('filter', 'contacts', { userId: ctx.user!.id }).then((contacts: Contact[]) => {
  const contactIds = contacts.map(c => c.contactUserId);

  // 3. Verify each visible transaction involves one of those contacts
  cy.getBySel('transaction-item')
    .should('have.length.at.least', 1)
    .each(($el) => {
      cy.wrap($el)
        .find('[data-test^="transaction-sender-"], [data-test^="transaction-receiver-"]')
        .invoke('attr', 'data-test')
        .then((attr) => {
          const id = attr!.split('-').pop();
          expect(contactIds).to.include(id);
        });
    });
});
 });
    });
});
