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

  cy.database("filter", "contacts", {
    userId: ctx.user!.id
  }).then((contacts: Contact[]) => {
    const contactIds = contacts.map(contact => contact.contactUserId);

    // Navigate to contacts feed tab

    cy.getBySel("nav-contacts-tab").click();
    cy.wait("@contactsTransactions");

    // Skip test if user has no contacts

    if (contactIds.length === 0) {
      cy.log("User has no contacts. Test skipped.");
      return;
    }

    // Check if there are any transactions

    cy.get("body").then($body => {
      if ($body.find("[data-test=empty-list-header]").length > 0) {
        cy.log("No transactions found in friends feed. Test skipped.");
        return;
      }

      // Get all transaction items

      cy.getBySel("transaction-item").each($el => {
        // For each transaction, verify it involves a contact

        cy.wrap($el).within(() => {
          // Check sender and receiver IDs

          cy.get("[data-test*='sender-'], [data-test*='receiver-']").should($elements => {
            // Extract IDs from data-test attributes

            const ids = Array.from($elements).map(el => {
              const dataTest = el.getAttribute("data-test");
              return dataTest?.split("-")[2];
            });

            // Verify at least one party is a contact

            const hasContactParty = ids.some(id => contactIds.includes(id) || id === ctx.user!.id);
            expect(hasContactParty).to.be.true;
          });
        });
      });
    });
  });
 });
    });
});
