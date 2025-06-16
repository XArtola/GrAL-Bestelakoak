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
        it("first five items belong to contacts in public feed", () => {
// it("first five items belong to contacts in public feed", () => {
    // Navigate to public feed
    cy.getBySel(feedViews.public.selector).click();
    cy.wait(`@${feedViews.public.routeAlias}`);

    // Get the user's contacts first
    cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
        const contactIds = contacts.map(contact => contact.contactUserId);

        // Get the first 5 transactions (or fewer if less than 5 exist)
        cy.getBySel("transaction-item").then(($items) => {
            const numItems = $items.length;
            const count = Math.min(5, numItems);

            if (count === 0) {
                cy.log("No transactions in public feed to check.");
                return;
            }

            for (let i = 0; i < count; i++) {
                cy.wrap($items[i]).within(() => {
                    // Check if sender or receiver is a contact or the user themselves
                    // This requires inspecting the sender/receiver user IDs within the transaction item.
                    // The exact selectors for sender/receiver IDs might need adjustment based on actual DOM structure.
                    // Assuming data attributes like 'data-sender-id' and 'data-receiver-id' exist on elements within the transaction item.
                    let senderId: string | undefined;
                    let receiverId: string | undefined;

                    cy.get("[data-test*='transaction-sender-']").invoke('attr', 'data-test').then(senderDataTest => {
                        senderId = senderDataTest?.split('-')[2];
                        cy.get("[data-test*='transaction-receiver-']").invoke('attr', 'data-test').then(receiverDataTest => {
                            receiverId = receiverDataTest?.split('-')[2];

                            const isSenderContact = contactIds.includes(senderId!);
                            const isReceiverContact = contactIds.includes(receiverId!);
                            const isSenderUser = senderId === ctx.user!.id;
                            const isReceiverUser = receiverId === ctx.user!.id;

                            // In the public feed, transactions should ideally be between anyone.
                            // If the test intends to check if *these specific first five* involve contacts of the logged-in user,
                            // then the assertion should be that at least one party (sender or receiver) is a contact OR the user themselves.
                            // However, "belong to contacts" usually implies the transaction is *between* a contact and someone else, or between two contacts.
                            // Given the context of a "public" feed, it's more likely that we are checking if *any* of the involved parties are known to the user (i.e., are contacts).
                            // A stricter interpretation "belong to contacts" might mean *both* parties are contacts, or one is a contact and the other is not the user.
                            // For this, I'll assume "belong to contacts" means at least one of the participants is a contact of the logged-in user.
                            // Or, if not a contact, it could be a transaction involving the user themselves if that's considered "belonging".

                            // The original test name "first five items belong to contacts in public feed" is a bit ambiguous.
                            // A transaction "belongs" to a contact if:
                            // 1. The contact is the sender.
                            // 2. The contact is the receiver.
                            // It does not necessarily mean the *other* party is also a contact or the user.
                            // The public feed shows transactions from everyone.
                            // This test seems to want to verify that among the displayed public transactions,
                            // those involving the user's contacts are visible.

                            // Let's refine the check: a transaction "belongs to contacts" if either the sender or receiver is one of the user's contacts.
                            // It's also possible the transaction involves the user themselves, which might also be relevant in some contexts of "belonging".
                            // For a public feed, it's expected to see transactions not involving the user or their contacts.
                            // The test "first five items belong to contacts" implies an expectation that these specific items *must* involve contacts.
                            // This might be a specific seeding scenario.

                            // If the intent is that *each* of the first five items *must* involve a contact:
                            expect(isSenderContact || isReceiverContact || isSenderUser || isReceiverUser).to.be.true;
                        });
                    });
                });
            }
        });
    });
// });
 });
    });
});
