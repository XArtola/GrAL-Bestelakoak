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
<generated_code>
it("mine feed only shows personal transactions", () => {
    // Navigate to the personal feed
    cy.getBySel(feedViews.personal.tab).click();
    cy.wait(`@${feedViews.personal.routeAlias}`);

    // Verify that all transactions in the personal feed involve the current user
    cy.getBySel("transaction-item").each(($el) => {
        // For every transaction, it should be either sent or received by the current user
        const transactionInvolvesUser =
            $el.find(`[data-test="transaction-sender-${ctx.user!.id}"]`).length > 0 ||
            $el.find(`[data-test="transaction-receiver-${ctx.user!.id}"]`).length > 0;

        expect(transactionInvolvesUser).to.be.true;
    });
});
</generated_code>
 });
    });
});
