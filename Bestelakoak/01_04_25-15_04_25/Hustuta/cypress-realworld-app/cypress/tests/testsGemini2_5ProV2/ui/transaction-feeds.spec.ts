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
    it("toggles the navigation drawer", () => {
      if (isMobile()) {
        // Mobile: Drawer should start closed, toggle opens it, backdrop click closes it
        cy.getBySel("sidenav-drawer").should("not.be.visible");
        cy.getBySel("sidenav-toggle").click();
        cy.getBySel("sidenav-drawer").should("be.visible");
        cy.get(".MuiBackdrop-root").click({ force: true }); // Click backdrop to close
        cy.getBySel("sidenav-drawer").should("not.be.visible");
      } else {
        // Desktop: Drawer should start open, toggle button should not be visible
        cy.getBySel("sidenav-drawer").should("be.visible");
        cy.getBySel("sidenav-toggle").should("not.be.visible");
      }
    });
  });

  describe("renders and paginates all transaction feeds", function () {
    it("renders transactions item variations in feed", () => {
      // Navigate to personal feed
      cy.getBySel("nav-personal-tab").click();
      cy.wait(`@${feedViews.personal.routeAlias}`);

      // Check for a payment made by the user
      cy.database("find", "transactions", { senderId: ctx.user!.id, status: "complete" }).then(
        (transaction: Transaction) => {
          cy.contains(`[data-test*="transaction-item"]`, transaction.description)
            .should("be.visible")
            .find('[data-test="transaction-action-payment"]')
            .should("exist");
        }
      );

      // Check for a payment received by the user
      cy.database("find", "transactions", { receiverId: ctx.user!.id, status: "complete" }).then(
        (transaction: Transaction) => {
          cy.contains(`[data-test*="transaction-item"]`, transaction.description)
            .should("be.visible")
            .find('[data-test="transaction-action-payment"]')
            .should("exist");
        }
      );

      // Check for a request made by the user (pending)
      cy.database("find", "transactions", { senderId: ctx.user!.id, requestStatus: "pending" }).then(
        (transaction: Transaction) => {
          cy.contains(`[data-test*="transaction-item"]`, transaction.description).should("be.visible");
          // Assert request status indicator if available
        }
      );

      // Check for a request received by the user (pending)
      cy.database("find", "transactions", { receiverId: ctx.user!.id, requestStatus: "pending" }).then(
        (transaction: Transaction) => {
          cy.contains(`[data-test*="transaction-item"]`, transaction.description)
            .should("be.visible")
            .find('[data-test="transaction-action-request"]')
            .should("exist"); // Should show accept/reject buttons
        }
      );
    });

    _.each(feedViews, (feed, feedName) => {
      it(`paginates ${feedName} transaction feed`, () => {
        // Navigate to the specific feed tab
        cy.getBySel(`nav-${feed.tab}`).click();
        // Wait for the initial load
        cy.wait(`@${feed.routeAlias}`);
        // Assert initial number of items matches page size
        cy.getBySel("transaction-list").children().should("have.length", Cypress.env("paginationPageSize"));
        // Scroll to the bottom to trigger pagination
        cy.scrollTo("bottom");
        // Wait for the next page load
        cy.wait(`@${feed.routeAlias}`);
        // Assert total number of items is now double the page size
        cy.getBySel("transaction-list")
          .children()
          .should("have.length", Cypress.env("paginationPageSize") * 2);
      });
    });
  });

  describe("filters transaction feeds by date range", function () {
    if (isMobile()) {
      it("closes date range picker modal", () => {
        // Navigate to any feed
        cy.getBySel(`nav-${feedViews.personal.tab}`).click();
        cy.wait(`@${feedViews.personal.routeAlias}`);
        // Open date range picker
        cy.getBySel("transaction-list-filter-date-range-button").click();
        // Assert modal is visible
        cy.get(".MuiPickersModal-dialogRoot").should("be.visible");
        // Press escape key to close
        cy.get("body").type("{esc}");
        // Assert modal is closed
        cy.get(".MuiPickersModal-dialogRoot").should("not.exist");
      });
    }

    _.each(feedViews, (feed, feedName) => {
      it(`filters ${feedName} transaction feed by date range`, () => {
        // Define a date range based on seeded data (adjust if necessary)
        const targetDate = new Date(2021, 5, 15); // Example date, adjust based on seed data
        const startDate = startOfDayUTC(targetDate);
        const endDate = endOfDayUTC(targetDate);

        // Navigate to the feed tab
        cy.getBySel(`nav-${feed.tab}`).click();
        cy.wait(`@${feed.routeAlias}`);

        // Set the date range filter
        cy.setTransactionDateRange(startDate, endDate);
        cy.wait(`@${feed.routeAlias}`); // Wait for filtered results

        // Assert all visible transactions are within the date range
        cy.getBySelLike("transaction-item").each(($el) => {
          const createdAt = $el.attr("data-test-transaction-createdAt");
          expect(isWithinInterval(new Date(createdAt!), { start: startDate, end: endDate })).to.be.true;
        });
      });

      it(`does not show ${feedName} transactions for out of range date limits`, () => {
        // Define a date range known to have no transactions
        const startDate = startOfDayUTC(new Date(2000, 0, 1));
        const endDate = endOfDayUTC(new Date(2000, 0, 2));

        // Navigate to the feed tab
        cy.getBySel(`nav-${feed.tab}`).click();
        cy.wait(`@${feed.routeAlias}`);

        // Set the date range filter
        cy.setTransactionDateRange(startDate, endDate);
        cy.wait(`@${feed.routeAlias}`); // Wait for filtered results

        // Assert that the transaction list is empty
        cy.getBySel("transaction-list").should("not.exist");
        cy.getBySel("empty-list-header").should("be.visible").and("contain", "No Transactions");
      });
    });
  });

  describe("filters transaction feeds by amount range", function () {
    const dollarAmountRange = {
      min: 200,
      max: 800,
    };

    _.each(feedViews, (feed, feedName) => {
      it(`filters ${feedName} transaction feed by amount range`, () => {
        // Navigate to the feed tab
        cy.getBySel(`nav-${feed.tab}`).click();
        cy.wait(`@${feed.routeAlias}`);

        // Set the amount range filter
        cy.setTransactionAmountRange(dollarAmountRange.min, dollarAmountRange.max);
        cy.wait(`@${feed.routeAlias}`); // Wait for filtered results

        // Assert all visible transaction amounts are within the range
        cy.getBySelLike("transaction-amount").each(($el) => {
          // Extract amount in cents from data attribute
          const amountInCents = parseInt($el.attr("data-test-transaction-amount")!);
          // Convert to dollars (or units) for comparison
          const amountInDollars = Dinero({ amount: amountInCents }).toUnit();
          expect(amountInDollars).to.be.within(dollarAmountRange.min, dollarAmountRange.max);
        });
      });

      it(`does not show ${feedName} transactions for out of range amount limits`, () => {
        // Define an amount range known to have no transactions
        const minAmount = 1;
        const maxAmount = 10;

        // Navigate to the feed tab
        cy.getBySel(`nav-${feed.tab}`).click();
        cy.wait(`@${feed.routeAlias}`);

        // Set the amount range filter
        cy.setTransactionAmountRange(minAmount, maxAmount);
        cy.wait(`@${feed.routeAlias}`); // Wait for filtered results

        // Assert that the transaction list is empty
        cy.getBySel("transaction-list").should("not.exist");
        cy.getBySel("empty-list-header").should("be.visible").and("contain", "No Transactions");
      });
    });
  });

  describe("Feed Item Visibility", () => {
    beforeEach(() => {
      // Get contact IDs for the logged-in user
      cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
        ctx.contactIds = contacts.map((contact) => contact.contactUserId);
      });
    });

    it("mine feed only shows personal transactions", () => {
      // Navigate to personal feed
      cy.getBySel("nav-personal-tab").click();
      cy.wait(`@${feedViews.personal.routeAlias}`);

      // Assert all items involve the logged-in user
      cy.getBySelLike("transaction-item").each(($el) => {
        const senderId = $el.attr("data-test-transaction-sender-id");
        const receiverId = $el.attr("data-test-transaction-receiver-id");
        expect(senderId === ctx.user!.id || receiverId === ctx.user!.id).to.be.true;
      });
    });

    it("first five items belong to contacts in public feed", () => {
      // Navigate to public feed
      cy.getBySel("nav-public-tab").click();
      cy.wait(`@${feedViews.public.routeAlias}`);

      // Check the first 5 items
      cy.getBySelLike("transaction-item")
        .then(($items) => {
          // Ensure there are at least 5 items before slicing
          const count = $items.length;
          const itemsToCheck = $items.slice(0, Math.min(count, 5));
          return cy.wrap(itemsToCheck);
        })
        .each(($el) => {
          const senderId = $el.attr("data-test-transaction-sender-id");
          const receiverId = $el.attr("data-test-transaction-receiver-id");
          // Assert at least one party is a contact (or the user themselves, though less likely in public)
          expect(
            ctx.contactIds!.includes(senderId!) ||
              ctx.contactIds!.includes(receiverId!) ||
              senderId === ctx.user!.id ||
              receiverId === ctx.user!.id
          ).to.be.true;
        });
    });

    it("friends feed only shows contact transactions", () => {
      // Navigate to contacts feed
      cy.getBySel("nav-contacts-tab").click();
      cy.wait(`@${feedViews.contacts.routeAlias}`);

      // Assert all items involve at least one contact
      cy.getBySelLike("transaction-item").each(($el) => {
        const senderId = $el.attr("data-test-transaction-sender-id");
        const receiverId = $el.attr("data-test-transaction-receiver-id");
        // Assert that either sender or receiver is in the contact list
        expect(ctx.contactIds!.includes(senderId!) || ctx.contactIds!.includes(receiverId!)).to.be.true;
      });
    });
  });
});
