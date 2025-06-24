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
// Get the current user's contacts

  cy.database("filter", "contacts", {
    userId: ctx.user!.id
  }).then((contacts: Contact[]) => {
    const contactIds = contacts.map(contact => contact.contactUserId);

    // Navigate to the friends feed

    cy.getBySel(feedViews.contacts.tab).click();
    cy.wait(`@${feedViews.contacts.routeAlias}`);

    // Check if the feed is empty

    cy.get("body").then($body => {
      if ($body.find("[data-test=empty-list-header]").length > 0) {
        // If the list is empty, the test passes as there are no non-contact transactions

        cy.log("Friends feed is empty. Test considered passing.");
        return;
      }

      // Verify each transaction item

      cy.getBySel("transaction-item").each($el => {
        // Get sender and receiver user IDs from data attributes

        // Assuming sender/receiver id is part of a data-test attribute like 'transaction-sender-USER_ID'

        let senderId: string | undefined;
        let receiverId: string | undefined;
        cy.wrap($el).find("[data-test*='transaction-sender-']").invoke("attr", "data-test").then(dataTest => {
          senderId = dataTest?.replace("transaction-sender-", "");
        });
        cy.wrap($el).find("[data-test*='transaction-receiver-']").invoke("attr", "data-test").then(dataTest => {
          receiverId = dataTest?.replace("transaction-receiver-", "");
        }).then(() => {
          // A transaction is valid if:

          // 1. The current user sent it to a contact

          // 2. The current user received it from a contact

          // 3. It's between two of the current user's contacts

          const isSenderContact = senderId ? contactIds.includes(senderId) : false;
          const isReceiverContact = receiverId ? contactIds.includes(receiverId) : false;
          const isSenderCurrentUser = senderId === ctx.user!.id;
          const isReceiverCurrentUser = receiverId === ctx.user!.id;
          const isValidFriendTransaction = isSenderCurrentUser && isReceiverContact || isReceiverCurrentUser && isSenderContact || isSenderContact && isReceiverContact;
          expect(isValidFriendTransaction, `Transaction between ${senderId} and ${receiverId} is valid for friends feed`).to.be.true;
        });
      });
    });
  });
 });
    });
});
