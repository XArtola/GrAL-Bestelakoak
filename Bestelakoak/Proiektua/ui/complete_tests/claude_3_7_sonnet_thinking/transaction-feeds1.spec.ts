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
// Visit the main application page which shows the transaction feed

  cy.visit("/");

  // Wait for transactions to load

  cy.wait(["@publicTransactions", "@notifications"]);

  // Test behavior based on viewport size

  if (isMobile()) {
    // For mobile viewport: drawer should be initially closed

    cy.getBySel("sidenav-toggle").should("be.visible");
    cy.getBySel("sidenav").should("have.css", "transform").and("include", "matrix");

    // Open the drawer

    cy.getBySel("sidenav-toggle").click();

    // Verify drawer is open

    cy.getBySel("sidenav").should("be.visible");
    cy.getBySel("sidenav-user-full-name").should("be.visible");

    // Close the drawer

    cy.getBySel("sidenav-toggle").click();

    // Verify drawer is closed again

    cy.getBySel("sidenav").should("have.css", "transform").and("include", "matrix");
  } else {
    // For desktop viewport: navigation should be visible

    cy.getBySel("sidenav").should("be.visible");

    // Desktop has a permanent drawer, so verify key elements are visible

    cy.getBySel("sidenav-user-full-name").should("be.visible");
    cy.getBySel("sidenav-home").should("be.visible");
    cy.getBySel("sidenav-personal").should("be.visible");

    // Test collapse functionality if available on desktop

    if (Cypress.$('"[data-test=sidenav-toggle]"').length > 0) {
      cy.getBySel("sidenav-toggle").click();
      cy.getBySel("sidenav").should("have.class", "MuiDrawer-paperClose");
      cy.getBySel("sidenav-toggle").click();
      cy.getBySel("sidenav").should("not.have.class", "MuiDrawer-paperClose");
    }
  }
 });
    });
});
