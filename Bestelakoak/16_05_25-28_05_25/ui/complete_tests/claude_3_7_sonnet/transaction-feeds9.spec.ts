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
// Navigate to personal feed
cy.getBySel("nav-personal-tab").click();
cy.wait(`@${feedViews.personal.routeAlias}`);

// Get user's ID for later comparison
const userId = ctx.user!.id;

// Check if there are any transactions
cy.getBySel("transaction-item").then(($items) => {
if ($items.length === 0) {
cy.getBySel("empty-list-header").should("be.visible");
cy.log("No transactions found in personal feed. Test skipped.");
return;
}

// For each transaction in the personal feed, verify it involves the current user
cy.getBySel("transaction-item").each(($el) => {
// Check if the transaction sender or receiver is the current user
cy.wrap($el).within(() => {
cy.get("[data-test*='transaction-sender-'], [data-test*='transaction-receiver-']")
.invoke("attr", "data-test")
.then((dataTest) => {
// Extract the user ID from the data-test attribute
const transactionUserId = dataTest!.split("-")[2];

// Assert that the transaction involves the current user
expect(transactionUserId).to.equal(userId);
 });
    });
});
