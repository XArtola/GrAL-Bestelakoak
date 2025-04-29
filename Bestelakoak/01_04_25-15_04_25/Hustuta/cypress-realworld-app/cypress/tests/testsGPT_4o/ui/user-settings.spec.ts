import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
describe("User Settings", function () {
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("PATCH", "/users/*").as("updateUser");
        cy.intercept("GET", "/notifications*").as("getNotifications");
        cy.database("find", "users").then((user: User) => {
            cy.loginByXstate(user.username);
        });
        if (isMobile()) {
            cy.getBySel("sidenav-toggle").click();
        }
        cy.getBySel("sidenav-user-settings").click();
    });
    it("renders the user settings form", () => {
        // <generated_code>
        // Verify that the user settings form is rendered correctly
        cy.getBySel("user-settings-form").should("be.visible");
        cy.get("#firstName").should("have.value", updatedUserInfo.firstName);
        cy.get("#lastName").should("have.value", updatedUserInfo.lastName);
        cy.get("#email").should("have.value", updatedUserInfo.email);
        cy.get("#phoneNumber").should("have.value", updatedUserInfo.phoneNumber);
        // </generated_code>
    });

    it("should display user setting form errors", () => {
        // <generated_code>
        // Attempt to submit the form with missing fields and verify error messages
        cy.get("#firstName").clear();
        cy.get("#lastName").clear();
        cy.get("button[type='submit']").click();
        cy.contains("First name is required").should("be.visible");
        cy.contains("Last name is required").should("be.visible");
        // </generated_code>
    });

    it("updates first name, last name, email and phone number", () => {
        // <generated_code>
        // Update user information and verify the changes are saved
        cy.get("#firstName").clear().type("Updated First Name");
        cy.get("#lastName").clear().type("Updated Last Name");
        cy.get("#email").clear().type("updated.email@example.com");
        cy.get("#phoneNumber").clear().type("1234567890");
        cy.get("button[type='submit']").click();
        cy.wait("@updateUser");
        cy.contains("User information updated successfully").should("be.visible");
        // Verify updated values
        cy.get("#firstName").should("have.value", "Updated First Name");
        cy.get("#lastName").should("have.value", "Updated Last Name");
        cy.get("#email").should("have.value", "updated.email@example.com");
        cy.get("#phoneNumber").should("have.value", "1234567890");
        // </generated_code>
    });
});
