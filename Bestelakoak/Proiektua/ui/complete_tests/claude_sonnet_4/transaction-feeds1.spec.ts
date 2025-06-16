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
// Visit the main page where the navigation drawer should be present

  cy.visit("/");

  // Wait for the page to load and transactions to be fetched

  cy.wait("@personalTransactions");

  // Check if we're on mobile or desktop to handle different drawer behaviors

  if (isMobile()) {
    // On mobile, the drawer should be closed by default

    // Look for the hamburger menu button and click it to open drawer

    cy.getBySel("sidenav-toggle").click();

    // Verify the drawer is now visible/open

    cy.getBySel("sidenav-drawer").should("be.visible");

    // Click the toggle again to close the drawer

    cy.getBySel("sidenav-toggle").click();

    // Verify the drawer is now hidden/closed

    cy.getBySel("sidenav-drawer").should("not.be.visible");
  } else {
    // On desktop, the drawer might be open by default

    // Check if drawer is visible initially

    cy.get("body").then($body => {
      if ($body.find("[data-test=sidenav-drawer]").is(":visible")) {
        // If visible, click to hide it

        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-drawer").should("not.be.visible");

        // Click again to show it

        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-drawer").should("be.visible");
      } else {
        // If hidden, click to show it

        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-drawer").should("be.visible");

        // Click again to hide it

        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-drawer").should("not.be.visible");
      }
    });
  }
 });
    });
});
