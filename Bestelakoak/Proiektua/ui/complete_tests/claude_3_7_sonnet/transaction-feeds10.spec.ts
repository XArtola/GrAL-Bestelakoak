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
// Get the user's contacts first to determine their IDs

  cy.database("filter", "contacts", {
    userId: ctx.user!.id
  }).then((contacts: Contact[]) => {
    const contactIds = contacts.map(contact => contact.contactUserId);
    ctx.contactIds = contactIds;

    // Skip test if user has no contacts

    if (contactIds.length === 0) {
      cy.log("User has no contacts. Test skipped.");
      return;
    }

    // Navigate to public feed

    cy.getBySel("nav-public-tab").click();
    cy.wait(`@${feedViews.public.routeAlias}`);

    // Verify transactions have loaded

    cy.getBySel("transaction-item").should("exist");

    // Check the first 5 transactions (or fewer if less than 5 exist)

    cy.getBySel("transaction-item").then($items => {
      const itemsToCheck = Math.min($items.length, 5);
      if (itemsToCheck === 0) {
        cy.log("No transactions found in public feed. Test skipped.");
        return;
      }

      // For each of the first 5 transactions

      for (let i = 0; i < itemsToCheck; i++) {
        cy.wrap($items[i]).within(() => {
          // Check if either sender or receiver is in the user's contacts

          cy.get("[data-test*='transaction-sender-'], [data-test*='transaction-receiver-']").invoke("attr", "data-test").then(dataTest => {
            // Extract the user ID from the data attribute

            const regex = /transaction-(sender|receiver)-([a-f0-9-]+)/;
            const match = dataTest?.match(regex);
            if (match && match.length > 2) {
              const userId = match[2];

              // Verify this transaction involves a contact

              const isContactTransaction = contactIds.includes(userId);
              expect(isContactTransaction, `Transaction ${i + 1} should involve a contact`).to.be.true;
            } else {
              // If we can't extract the ID properly, log an issue

              cy.log(`Could not extract user ID from data-test attribute: ${dataTest}`);
            }
          });
        });
      }
    });
  });
 });
    });
});
