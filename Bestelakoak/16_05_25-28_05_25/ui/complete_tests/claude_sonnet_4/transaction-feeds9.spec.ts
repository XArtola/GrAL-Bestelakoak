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
// mine feed only shows personal transactions
it("mine feed only shows personal transactions", () => {
// Navigate to the personal/mine feed
cy.getBySel("nav-personal-tab").click();
cy.wait("@personalTransactions");

// Verify that transactions are displayed
cy.getBySel("transaction-item").should("exist");

// Check each transaction item to ensure it involves the current user
cy.getBySel("transaction-item").each(($transactionItem) => {
// Look for sender and receiver elements within each transaction
cy.wrap($transactionItem).within(() => {
// Check if the current user is either the sender or receiver
// Using a promise to handle the assertion properly
cy.get("body").then(() => {
const hasSender = $transactionItem.find(`[data-test*="sender-${ctx.user!.id}"]`).length > 0;
const hasReceiver = $transactionItem.find(`[data-test*="receiver-${ctx.user!.id}"]`).length > 0;

// Assert that the user is involved in this transaction
expect(hasSender || hasReceiver).to.be.true;
});
});
});

// Verify the personal tab is selected/active
cy.getBySel("nav-personal-tab").should("have.class", "Mui-selected");
});
 });
    });
});
