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
// it("mine feed only shows personal transactions")
it("mine feed only shows personal transactions", () => {
// Visit base URL and wait for data to load
cy.visit("/");

// Navigate to personal feed
cy.getBySel("nav-personal-tab").click();
cy.wait(`@${feedViews.personal.routeAlias}`);

// Check that transactions exist
cy.getBySel("transaction-item").should("exist");

// Get the current user's ID to verify transactions
cy.getBySel("transaction-item").each(($el) => {
// For each transaction, verify that the current user is either the sender or receiver
const transactionInvolvesUser =
$el.find(`[data-test="transaction-sender-${ctx.user!.id}"]`).length > 0 ||
$el.find(`[data-test="transaction-receiver-${ctx.user!.id}"]`).length > 0;

// Assert that the transaction involves the current user
expect(transactionInvolvesUser).to.be.true;
});

// Verify the "mine" tab is selected
cy.getBySel("nav-personal-tab")
.should("have.class", "Mui-selected")
.and("contain", "mine");
});
 });
    });
});
