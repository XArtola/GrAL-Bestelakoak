import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
type BankAccountsTestCtx = {
    user?: User;
};
describe("Bank Accounts", function () {
    const ctx: BankAccountsTestCtx = {};
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("GET", "/notifications").as("getNotifications");
        cy.intercept("POST", apiGraphQL, (req) => {
            const operationAliases: Record<string, string> = {
                ListBankAccount: "gqlListBankAccountQuery",
                CreateBankAccount: "gqlCreateBankAccountMutation",
                DeleteBankAccount: "gqlDeleteBankAccountMutation",
            };
            const { body } = req;
            const operationName = body?.operationName;
            if (body.hasOwnProperty("operationName") &&
                operationName &&
                operationAliases[operationName]) {
                req.alias = operationAliases[operationName];
            }
        });
        cy.database("find", "users").then((user: User) => {
            ctx.user = user;
            return cy.loginByXstate(ctx.user.username);
        });
    });
    it("creates a new bank account", () => {
        cy.getBySel("bankaccount-new").click();
        
        // Fill bank account form
        cy.getBySel("bankaccount-bankName-input").type("The Best Bank");
        cy.getBySel("bankaccount-routingNumber-input").type("987654321");
        cy.getBySel("bankaccount-accountNumber-input").type("123456789");
        cy.getBySel("bankaccount-submit").click();
    
        cy.wait("@gqlCreateBankAccountMutation");
        cy.getBySel("bankaccount-list").should("be.visible");
    });
    
    it("should display bank account form errors", () => {
        cy.getBySel("bankaccount-new").click();
        cy.getBySel("bankaccount-submit").click();
    
        cy.getBySel("bankaccount-bankName-input").should("have.class", "Mui-error");
        cy.getBySel("bankaccount-routingNumber-input").should("have.class", "Mui-error");
        cy.getBySel("bankaccount-accountNumber-input").should("have.class", "Mui-error");
    });
    
    it("soft deletes a bank account", () => {
        cy.getBySel("bankaccount-list").should("be.visible");
        cy.getBySel("bankaccount-delete").first().click();
        cy.wait("@gqlDeleteBankAccountMutation");
    });
    
    it("renders an empty bank account list state with onboarding modal", () => {
        // Find a user and check if they have bank accounts through database query
        cy.database("find", "users").then((users: User[]) => {
            const firstUser = users[0];
            // Query bank accounts separately
            cy.database("find", "bankaccounts", { userId: firstUser.id })
                .then((bankAccounts: any[]) => {
                    if (bankAccounts.length === 0) {
                        cy.loginByXstate(firstUser.username);
                        cy.getBySel("bankaccount-list").should("not.exist");
                        cy.getBySel("empty-list-header").should("exist");
                        cy.getBySel("user-onboarding-dialog").should("be.visible");
                    } else {
                        // Create a new user if the first one has bank accounts
                        cy.database("find", "users", { id: { $nin: bankAccounts.map(ba => ba.userId) } })
                            .then((usersWithoutAccounts: User[]) => {
                                const newUser = usersWithoutAccounts[0];
                                cy.loginByXstate(newUser.username);
                                cy.getBySel("bankaccount-list").should("not.exist");
                                cy.getBySel("empty-list-header").should("exist");
                                cy.getBySel("user-onboarding-dialog").should("be.visible");
                            });
                    }
                });
        });
    });
});
