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
    describe("renders and paginates all transaction feeds", function () {
        _.each(feedViews, (feed, feedName) => {
            it('paginates ${feedName} transaction feed', () => {
    // paginates public transaction feed
    cy.getBySel(feedViews.public.tab).click();
    cy.wait(`@${feedViews.public.routeAlias}`);
    // Assert that at least one transaction item is visible
    cy.getBySelLike("transaction-item").should("exist");
    // Scroll to bottom to trigger pagination
    cy.get("body").then(($body) => {
      if ($body.find('[data-test="transaction-list-pagination"]').length) {
        cy.getBySel("transaction-list-pagination").scrollIntoView();
        cy.getBySel("transaction-list-pagination").should("be.visible");
        // Click next page if pagination button exists
        cy.getBySel("transaction-list-pagination").click();
        cy.wait(`@${feedViews.public.routeAlias}`);
        // Assert more items loaded
        cy.getBySelLike("transaction-item").should("have.length.greaterThan", 1);
      }
    });
  });
        });
    });
});
