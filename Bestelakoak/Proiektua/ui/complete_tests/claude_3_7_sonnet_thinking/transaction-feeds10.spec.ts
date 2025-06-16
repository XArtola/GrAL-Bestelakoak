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
// Get the user's contacts first

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

    // Check if there are any transactions in the feed

    cy.get("body").then($body => {
      if ($body.find("[data-test='empty-list-header']").length > 0) {
        cy.log("No transactions found in public feed. Test skipped.");
        return;
      }

      // Ensure we have transaction items to check

      cy.getBySel("transaction-item").should("exist");

      // Check each of the first 5 items (or fewer if there aren't 5)

      cy.getBySel("transaction-item").each(($el, index) => {
        // Only check the first 5 items

        if (index >= 5) return false;

        // Get the transaction ID from the element

        cy.wrap($el).invoke("attr", "data-transaction-id").then(transactionId => {
          // Use the database to check if this transaction involves a contact

          cy.database("find", "transactions", {
            id: transactionId
          }).then(transaction => {
            // A transaction belongs to a contact if sender or receiver is a contact

            const belongsToContact = contactIds.includes(transaction.senderId) || contactIds.includes(transaction.receiverId);
            expect(belongsToContact).to.be.true;
          });
        });
      }).then($items => {
        // If we have fewer than 5 items, log that info

        if ($items.length < 5) {
          cy.log(`Only ${$items.length} transaction items found in the feed.`);
        }
      });
    });
  });
 });
    });
});
