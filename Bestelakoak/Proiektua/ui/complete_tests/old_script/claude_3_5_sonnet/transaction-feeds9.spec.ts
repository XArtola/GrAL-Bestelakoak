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
        it("mine feed only shows personal transactions", () => {
---

tools: ['codebase']

---



#file:cypress-realworld-app 

You are tasked with generating the code inside the 'it' blocks for a Cypress test suite. The test suite is for user sign-up and login functionality. You will be provided with the test suite structure and user information to use in your generated code.



Here is the Cypress test code structure:



<cypress_test_code>

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

        it("mine feed only shows personal transactions", () => { });

    });

});



</cypress_test_code>



And here is the user information to use in your tests:



<user_info>

{}

</user_info>



Your task is to generate the code inside each 'it' block so that the Cypress test runs and gets positive results. Follow these guidelines:



1. For each 'it' block, write Cypress commands that test the functionality described in the test name.

2. Use the provided user information (firstName, lastName, username, password) in your test commands where appropriate.

3. Ensure that your generated code follows Cypress best practices and conventions.

4. Include appropriate assertions to verify the expected behavior of each test.

5. If a test requires multiple steps, use comments to explain each step.

6. Do not modify the existing code structure or add new 'it' blocks.



When using the user information, refer to it as 'userInfo' followed by the property name, e.g., 'userInfo.firstName'.



If you encounter any scenarios where you need additional information that isn't provided, do not make assumptions. Instead, indicate that more information is needed for that specific test.



For error handling tests, use invalid data that is clearly different from the provided user information.



Place your generated code for each 'it' block within <generated_code> tags, and include the original 'it' block description as a comment before each block of generated code.



Begin generating the code for each 'it' block now.





> Copilot: I'll help generate the code for the test suite. Based on the provided test structure, we need to implement the "mine feed only shows personal transactions" test.

> 

> <generated_code>

> // it("mine feed only shows personal transactions")

> it("mine feed only shows personal transactions", () => {

>     // Visit base URL and wait for data to load

>     cy.visit("/");

>     

>     // Navigate to personal feed

>     cy.getBySel("nav-personal-tab").click();

>     cy.wait(`@${feedViews.personal.routeAlias}`);

> 

>     // Check that transactions exist

>     cy.getBySel("transaction-item").should("exist");

> 

>     // Get the current user's ID to verify transactions

>     cy.getBySel("transaction-item").each(($el) => {

>         // For each transaction, verify that the current user is either the sender or receiver

>         const transactionInvolvesUser = 

>             $el.find(`[data-test="transaction-sender-${ctx.user!.id}"]`).length > 0 ||

>             $el.find(`[data-test="transaction-receiver-${ctx.user!.id}"]`).length > 0;

>         

>         // Assert that the transaction involves the current user

>         expect(transactionInvolvesUser).to.be.true;

>     });

> 

>     // Verify the "mine" tab is selected

>     cy.getBySel("nav-personal-tab")

>         .should("have.class", "Mui-selected")

>         .and("contain", "mine");

> });

> </generated_code>

> 

> This implementation:

> 

> 1. Visits the base URL and navigates to the personal transactions feed

> 2. Verifies that transaction items exist in the feed

> 3. Checks each transaction to ensure it involves the current user (either as sender or receiver)

> 4. Verifies the "mine" tab is correctly selected

> 

> The code uses:

> - Data attributes for selecting elements (`getBySel` custom command)

> - Cypress aliases for network requests

> - The context object (`ctx`) to access the current user

> - jQuery traversal to find nested elements

> - Cypress assertions to verify conditions

> 

> The test assumes that:

> - The app uses data-test attributes for element selection

> - Transactions have sender and receiver IDs in their data-test attributes

> - The Material-UI "Mui-selected" class is used for active tabs

> 

> Let me know if you need any clarification or adjustments to this implementation.


 });
    });
});
