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
        it('mine feed only shows personal transactions', () => {
    // Go to the "mine" feed tab

      cy.getBySel(feedViews.personal.tab).click();
      cy.wait(`@${feedViews.personal.routeAlias}`);

      // Assert that each transaction item in the feed belongs to the logged-in user

      cy.getBySelLike("transaction-item").each($el => {
        cy.wrap($el).find('[data-test="transaction-participants"]').invoke("text").then(text => {
          // The user's full name should appear in the participants text

          expect(text).to.include(ctx.user.firstName);
          expect(text).to.include(ctx.user.lastName);
        });
      });

      // Optionally, assert that the feed is not empty

      cy.getBySelLike("transaction-item").should("have.length.greaterThan", 0);
  });
    });
});
