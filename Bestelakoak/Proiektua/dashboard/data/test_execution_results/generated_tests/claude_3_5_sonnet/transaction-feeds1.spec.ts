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
// Initial state check - full screen view (nav drawer visible)

  cy.getBySel("sidenav").should("be.visible");
  cy.getBySel("sidenav-home").should("be.visible");
  cy.getBySel("sidenav-user-full-name").should("be.visible");

  // If on mobile viewport, test drawer toggle functionality

  cy.viewport("iphone-x");

  // Initial state on mobile - drawer should be hidden

  cy.getBySel("sidenav").should("not.be.visible");

  // Click hamburger menu to open drawer

  cy.getBySel("drawer-button").click();
  cy.getBySel("sidenav").should("be.visible");

  // Click outside drawer to close it

  cy.get("body").click(0, 0);
  cy.getBySel("sidenav").should("not.be.visible");

  // Return to desktop view - drawer should be visible again

  cy.viewport(1024, 768);
  cy.getBySel("sidenav").should("be.visible");
 });
    });
});
