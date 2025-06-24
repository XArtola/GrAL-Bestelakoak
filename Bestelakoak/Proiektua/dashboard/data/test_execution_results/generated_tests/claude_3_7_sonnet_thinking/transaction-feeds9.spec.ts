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
        it("mine feed only shows personal transactions", () => {
// Navigate to the personal transactions feed

  cy.getBySel("nav-personal-tab").click();
  cy.wait(`@${feedViews.personal.routeAlias}`);

  // Ensure transactions are loaded

  cy.getBySel("transaction-item").should("exist");

  // Check if we have any transactions

  cy.get("body").then($body => {
    // If there are no transactions (empty state), skip the test

    if ($body.find("[data-test='empty-list-header']").length > 0) {
      cy.log("No transactions found in personal feed. Test skipped.");
      return;
    }

    // Get the current user's ID for comparison

    const userId = ctx.user!.id;

    // Check all transactions in the personal feed

    cy.getBySel("transaction-item").each($el => {
      // For each transaction, verify it involves the current user

      // (either as sender or receiver)

      cy.wrap($el).within(() => {
        cy.get("[data-test*='transaction-sender-'], [data-test*='transaction-receiver-']").invoke("attr", "data-test").then(dataTest => {
          const transactionUserId = dataTest!.split("-")[2];

          // Assert that this transaction involves the current user

          expect(transactionUserId === userId || $el.find(`[data-test="transaction-sender-${userId}"]`).length > 0 || $el.find(`[data-test="transaction-receiver-${userId}"]`).length > 0).to.be.true;
        });
      });
    });
  });
 });
    });
});
