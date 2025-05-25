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
    describe("app layout and responsiveness", function () {
        it("toggles the navigation drawer", () => {
// Check if running on mobile
if (isMobile()) {
// On mobile, the drawer should be closed initially
cy.getBySel("sidenav-drawer").should("not.be.visible");
// Open the drawer
cy.getBySel("sidenav-toggle").click();
cy.getBySel("sidenav-drawer").should("be.visible");
// Close the drawer by clicking the backdrop
cy.get(".MuiBackdrop-root").click();
cy.getBySel("sidenav-drawer").should("not.be.visible");
} else {
// On desktop, the drawer should be open initially
cy.getBySel("sidenav-drawer").should("be.visible");
// Close the drawer
cy.getBySel("sidenav-toggle").click();
cy.getBySel("sidenav-drawer").should("not.be.visible");
// Open the drawer
cy.getBySel("sidenav-toggle").click();
cy.getBySel("sidenav-drawer").should("be.visible");
}
//
 });
    });
});
