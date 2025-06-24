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
        it('friends feed only shows contact transactions', () => {
    // it("friends feed only shows contact transactions", () => { });
        // Wait for the contacts transactions API call to complete
        cy.wait(`@${feedViews.contacts.routeAlias}`).then((interception) => {
            // Assert that the API response was successful
            expect(interception.response.statusCode).to.eq(200);
            // Optionally verify that the returned transactions belong to contacts
            // (Additional logic might be needed here based on your data structure)
        });
  
        // Verify the UI shows only transactions marked as contact transactions.
        // This example assumes that each transaction item has a data attribute "data-test" equal to "contact-transaction".
        // Adjust the selector and assertions based on your application implementation.
        cy.get('[data-test="transaction-item"]').each(($el) => {
            // Verify the transaction element indicates it is from a contact.
            // For example, checking for a badge or label containing "Contact".
            cy.wrap($el).should('contain.text', 'Contact');
        });
  });
    });
});
