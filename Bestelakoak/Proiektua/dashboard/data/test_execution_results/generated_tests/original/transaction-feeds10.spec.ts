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

  describe("Feed Item Visibility", () => {
    it("first five items belong to contacts in public feed", function () {
      cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
        ctx.contactIds = contacts.map((contact) => contact.contactUserId);
      });

      cy.wait("@publicTransactions")
        .its("response.body.results")
        .invoke("slice", 0, 5)
        .each((transaction: Transaction) => {
          const transactionParticipants = [transaction.senderId, transaction.receiverId];

          const contactsInTransaction = _.intersection(transactionParticipants, ctx.contactIds!);
          const message = `"${contactsInTransaction}" are contacts of ${ctx.user!.id}`;
          expect(contactsInTransaction, message).to.not.be.empty;
        });
      cy.getBySel("list-skeleton").should("not.exist");
      cy.visualSnapshot("First 5 Transaction Items belong to contacts");
    });
  });
});
