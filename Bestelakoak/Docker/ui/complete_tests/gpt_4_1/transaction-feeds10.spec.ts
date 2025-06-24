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
        it('first five items belong to contacts in public feed', () => {
    // first five items belong to contacts in public feed
    cy.getBySel(feedViews.public.tab).click();
    cy.wait(`@${feedViews.public.routeAlias}`);

    // Wait for the feed to load and ensure at least 5 items are present
    cy.getBySelLike("transaction-item").should("have.length.greaterThan", 4);

    // Get the user's contact IDs from the database
    cy.database("filter", "contacts", { userId: ctx.user.id }).then((contacts: Contact[]) => {
      const contactIds = contacts.map((c) => c.contactUserId);

      // For the first five transaction items, assert that either the sender or receiver is a contact
      cy.getBySelLike("transaction-item").each(($el, idx) => {
        if (idx  {
              cy.wrap($el)
                .invoke("attr", "data-test-transaction-receiver-id")
                .then((receiverId) => {
                  expect(
                    contactIds.includes(senderId) || contactIds.includes(receiverId),
                    `Transaction ${idx + 1} sender or receiver should be a contact`
                  ).to.be.true;
                });
            });
        }
      });
    });
  });
    });
});
