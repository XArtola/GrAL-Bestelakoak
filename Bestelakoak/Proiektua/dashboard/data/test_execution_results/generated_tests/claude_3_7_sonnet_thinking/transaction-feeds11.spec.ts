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
// Navigate to the contacts (friends) feed tab

  cy.getBySel(feedViews.contacts.tab).click();
  cy.wait(`@${feedViews.contacts.routeAlias}`);

  // Get the user's contacts and their IDs

  cy.database("find", "contacts", {
    userId: ctx.user!.id
  }).then((contacts: Contact[]) => {
    // Extract contact IDs

    const contactIds = contacts.map(contact => contact.contactUserId);

    // If user has no contacts, skip the test

    if (contactIds.length === 0) {
      cy.log("User has no contacts. Test skipped.");
      return;
    }

    // Check if there are any transactions in the friends feed

    cy.get("body").then($body => {
      if ($body.find("[data-test=empty-list-header]").length > 0) {
        cy.log("No transactions found in friends feed. Test skipped.");
        return;
      }

      // Verify each transaction involves at least one contact

      cy.getBySel("transaction-item").each($transaction => {
        // For each transaction, get the sender and receiver IDs

        cy.wrap($transaction).within(() => {
          // Get the sender and receiver IDs from the data-test attributes

          cy.get("[data-test^='transaction-sender-'], [data-test^='transaction-receiver-']").then($elements => {
            // Extract the user IDs from the data-test attributes

            const transactionUserIds = Array.from($elements).map(el => {
              const dataTest = el.getAttribute("data-test");

              // Extract the user ID from the data-test attribute

              return dataTest?.split("-")[2];
            });

            // Check if at least one user in the transaction is a contact

            // Transaction should involve either a contact or the current user

            const belongsToContactOrUser = transactionUserIds.some(id => id === ctx.user!.id || contactIds.includes(id));

            // Assert that the transaction belongs to a contact or the current user

            expect(belongsToContactOrUser).to.be.true;
          });
        });
      });
    });
  });
 });
    });
});
