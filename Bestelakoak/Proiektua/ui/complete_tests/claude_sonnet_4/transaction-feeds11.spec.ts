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
    ctx.contactIds = contactIds;

    // Navigate to contacts/friends feed

    cy.getBySel("nav-contacts-tab").click();
    cy.wait("@contactsTransactions");

    // Check if there are any transactions in the friends feed

    cy.get("body").then($body => {
      if ($body.find("[data-test=empty-list-header]").length > 0) {
        cy.log("No transactions found in friends feed. Test passed - empty state is valid.");
        return;
      }

      // If transactions exist, verify each one involves a contact

      cy.getBySel("transaction-item").should("have.length.at.least", 1);
      cy.getBySel("transaction-item").each($transactionItem => {
        // Check if this transaction involves any of the user's contacts

        cy.wrap($transactionItem).within(() => {
          // Look for sender and receiver elements to get their IDs

          cy.get("[data-test*='transaction-sender-'], [data-test*='transaction-receiver-']").should("exist").then($elements => {
            let involvesContact = false;
            $elements.each((index, element) => {
              const dataTest = element.getAttribute("data-test");
              if (dataTest) {
                // Extract user ID from data-test attribute

                const userId = dataTest.split("-")[2];

                // Check if this user ID is in our contacts or is the current user

                if (contactIds.includes(userId) || userId === ctx.user!.id) {
                  involvesContact = true;
                }
              }
            });

            // Assert that this transaction involves at least one contact

            expect(involvesContact).to.be.true;
          });
        });
      });
    });
  });
 });
    });
});
