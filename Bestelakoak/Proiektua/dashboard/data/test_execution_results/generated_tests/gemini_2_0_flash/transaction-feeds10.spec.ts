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
    cy.visit("/");
      cy.getBySel("nav-public-tab").click();
      cy.wait("@publicTransactions");
      cy.getBySelLike("transaction-item").slice(0, 5).each($el => {
        // Extract sender name from the transaction item

        const senderName = $el.find("[data-test^='transaction-sender']").text();

        // Get the list of contact IDs for the logged-in user

        cy.database("filter", "contacts", {
          userId: ctx.user?.id
        }).then((contacts: any[]) => {
          const contactUserIds = contacts.map(contact => contact.contactUserId);

          // Check if the sender name matches any of the contact user's first or last name

          cy.database("filter", "users", (user: any) => contactUserIds.includes(user.id)).then((contactUsers: any[]) => {
            const contactNames = contactUsers.map(user => `${user.firstName} ${user.lastName}`);
            const isContactTransaction = contactNames.some(contactName => senderName.includes(contactName));
            expect(isContactTransaction).to.be.true;
          });
        });
      });
  });
    });
});
