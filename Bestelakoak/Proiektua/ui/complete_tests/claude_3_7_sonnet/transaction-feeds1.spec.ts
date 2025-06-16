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
// Visit the home page (root URL)

  cy.visit("/");

  // Wait for transactions to load

  cy.wait("@publicTransactions");

  // Check if we need to handle responsive design differently

  if (isMobile()) {
    // On mobile, the drawer should be closed initially

    cy.getBySel("sidenav-drawer").should("not.be.visible");

    // Open the drawer by clicking the menu button

    cy.getBySel("sidenav-toggle").click();

    // Verify the drawer is open

    cy.getBySel("sidenav-drawer").should("be.visible");

    // Close the drawer by clicking the menu button again

    cy.getBySel("sidenav-toggle").click();

    // Verify the drawer is closed

    cy.getBySel("sidenav-drawer").should("not.be.visible");
  } else {
    // On desktop, the drawer should be visible by default

    cy.getBySel("sidenav-drawer").should("be.visible");

    // Close the drawer by clicking the collapse button

    cy.getBySel("sidenav-toggle").click();

    // Verify drawer is collapsed (not necessarily invisible, but collapsed)

    cy.getBySel("sidenav-drawer").should("have.class", "MuiDrawer-paperAnchorDockedLeft");
    cy.getBySel("sidenav-user-full-name").should("not.be.visible");

    // Open the drawer by clicking the expand button

    cy.getBySel("sidenav-toggle").click();

    // Verify drawer is expanded

    cy.getBySel("sidenav-drawer").should("be.visible");
    cy.getBySel("sidenav-user-full-name").should("be.visible");
  }
 });
    });
});
