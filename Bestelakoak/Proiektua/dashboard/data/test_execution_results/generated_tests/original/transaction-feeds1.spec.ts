import Dinero from "dinero.js";
import {
  User,
  Transaction,
  TransactionRequestStatus,
  TransactionResponseItem,
  Contact,
  TransactionStatus,
} from "../../../src/models";
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
    it("toggles the navigation drawer", function () {
      cy.wait("@notifications");
      cy.wait("@publicTransactions");
      if (isMobile()) {
        cy.getBySel("sidenav-home").should("not.exist");
        cy.visualSnapshot("Mobile Initial Side Navigation Not Visible");
        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-home").should("be.visible");
        cy.visualSnapshot("Mobile Toggle Side Navigation Visible");
        cy.get(".MuiBackdrop-root").click({ force: true });
        cy.getBySel("sidenav-home").should("not.exist");
        cy.visualSnapshot("Mobile Home Link Side Navigation Not Visible");

        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-home").click().should("not.exist");
        cy.visualSnapshot("Mobile Toggle Side Navigation Not Visible");
      } else {
        cy.getBySel("sidenav-home").should("be.visible");
        cy.visualSnapshot("Desktop Side Navigation Visible");
        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-home").should("not.be.visible");
        cy.visualSnapshot("Desktop Side Navigation Not Visible");
      }
    });
  });
});
