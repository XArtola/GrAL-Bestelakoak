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
```typescript
// first five items belong to contacts in public feed
it("first five items belong to contacts in public feed", () => {
// Navigate to the public feed tab
cy.getBySel("nav-public-tab").click();
cy.wait(`@${feedViews.public.routeAlias}`);

// Get the user's contacts to verify against
cy.database("filter", "contacts", { userId: ctx.user!.id }).then((contacts: Contact[]) => {
const contactIds = contacts.map(contact => contact.contactUserId);
ctx.contactIds = contactIds;

// If user has no contacts, skip this test
if (contactIds.length === 0) {
cy.log("User has no contacts. Skipping test.");
return;
}

// Check the first 5 transaction items (or fewer if less than 5 exist)
cy.getBySel("transaction-item").then($items => {
const itemsToCheck = Math.min(5, $items.length);

if (itemsToCheck === 0) {
cy.log("No transaction items found in public feed.");
return;
}

// Verify each of the first 5 items involves a contact
for (let i = 0; i < itemsToCheck; i++) {
cy.getBySel("transaction-item").eq(i).within(() => {
// Check if either sender or receiver is a contact
cy.get("[data-test*='sender-'], [data-test*='receiver-']").then($elements => {
let hasContact = false;

$elements.each((index, element) => {
const dataTest = Cypress.$(element).attr("data-test");
if (dataTest) {
const userId = dataTest.split("-")[1];
if (contactIds.includes(userId) || userId === ctx.user!.id) {
hasContact = true;
}
}
});

expect(hasContact).to.be.true;
});
});
}
});
});
});
```
 });
    });
});
