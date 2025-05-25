import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
describe("User Sign-up and Login", function () {
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("POST", "/users").as("signup");
        cy.intercept("POST", apiGraphQL, (req) => {
            const { body } = req;
            if (body.hasOwnProperty("operationName") && body.operationName === "CreateBankAccount") {
                req.alias = "gqlCreateBankAccountMutation";
            }
        });
    });
    it("should allow a visitor to sign-up, login, and logout", () => {
```typescript
// should allow a visitor to sign-up, login, and logout
it("should allow a visitor to sign-up, login, and logout", () => {
// Step 1: Visit the signup page
cy.visit("/signup");

// Step 2: Fill out the signup form with user information
cy.getBySel("signup-first-name").type("Bob");
cy.getBySel("signup-last-name").type("Ross");
cy.getBySel("signup-username").type(userInfo.username);
cy.getBySel("signup-password").type(userInfo.password);
cy.getBySel("signup-confirmPassword").type(userInfo.password);

// Step 3: Submit the signup form
cy.getBySel("signup-submit").click();

// Step 4: Wait for signup request to complete
cy.wait("@signup");

// Step 5: Complete onboarding by creating a bank account
// Navigate through onboarding flow
cy.getBySel("user-onboarding-next").click();

// Fill in bank account details
cy.getBySel("bankaccount-bankName-input").type(bankAccountInfo.bankName);
cy.getBySel("bankaccount-routingNumber-input").type(bankAccountInfo.routingNumber);
cy.getBySel("bankaccount-accountNumber-input").type(bankAccountInfo.accountNumber);

// Submit bank account form
cy.getBySel("bankaccount-submit").click();

// Wait for bank account creation
cy.wait("@gqlCreateBankAccountMutation");

// Complete onboarding
cy.getBySel("user-onboarding-next").click();
cy.getBySel("user-onboarding-done").click();

// Step 6: Verify successful login - should be on home page
cy.location("pathname").should("equal", "/");
cy.getBySel("sidenav-user-full-name").should("contain", `${userInfo.firstName} ${userInfo.lastName}`);

// Step 7: Logout
// Handle mobile navigation if needed
if (isMobile()) {
cy.getBySel("sidenav-toggle").click();
}
cy.getBySel("sidenav-signout").click();

// Step 8: Verify logout - should be redirected to signin page
cy.location("pathname").should("equal", "/signin");
});
```
 });
});
