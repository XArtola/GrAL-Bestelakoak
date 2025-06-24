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
        it('renders transactions item variations in feed', () => {
    // 
    // Original test: it("renders transactions item variations in feed", () => { });
    //
    // Step 1: Wait for the personal transactions alias to ensure data has loaded
    cy.wait("@personalTransactions");

    // Step 2: Verify that at least one transaction item is rendered
    cy.get("[data-test=transaction-item]").should("have.length.greaterThan", 0);

    // Step 3: Check that each transaction item displays expected variation elements (e.g. description, amount)
    cy.get("[data-test=transaction-item]").each(($el) => {
      cy.wrap($el).find(".transaction-description").should("be.visible");
      cy.wrap($el).find(".transaction-amount").should("be.visible");
    });
    //
  });
        _.each(feedViews, (feed, feedName) => {});
    });
});
