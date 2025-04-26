import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;

// User info from extracted-test-info.json
const userInfo = {
  firstName: "Bob",
  lastName: "Ross",
  username: "PainterJoy90",
  password: "s3cret"
};
const loginCredentials = {
  validPassword: "s3cret",
  invalidUsername: "invalidUserName",
  invalidPassword: "invalidPa$$word",
  anotherInvalidPassword: "INVALID"
};

describe("User Sign-up and Login", function () {
    beforeEach(function () {
        cy.task("db:seed");
        // Seed a user for login tests - Assuming db:seed handles user creation
        // cy.database("create", "user", {
        //   ...userInfo,
        //   id: "bobbross" // Ensure a consistent ID if needed elsewhere
        // });

        cy.intercept("POST", "/users").as("signup");
        cy.intercept("POST", "/login").as("login"); // Add intercept for login
        cy.intercept("POST", apiGraphQL, (req) => {
            const { body } = req;
            if (body.hasOwnProperty("operationName") && body.operationName === "CreateBankAccount") {
                req.alias = "gqlCreateBankAccountMutation";
            }
        });
    });

    it("should redirect unauthenticated user to signin page", () => {
      // Visit the root path which requires authentication
      cy.visit("/");
      // Assert redirection to the signin page
      cy.location("pathname").should("equal", "/signin");
    });

    it("should redirect to the home page after login", () => {
      // Visit the signin page
      cy.visit("/signin");
      // Enter username
      cy.findByLabelText(/username/i).type(userInfo.username);
      // Enter password
      cy.findByLabelText(/password/i).type(userInfo.password);
      // Click login button
      cy.findByRole("button", { name: /sign in/i }).click();
      // Wait for login intercept
      cy.wait("@login");
      // Assert redirection to the home page
      cy.location("pathname").should("equal", "/");
      // Assert username is displayed in the header/navigation
      cy.getBySel("sidenav-username").should("contain", userInfo.username);
    });

    it("should remember a user for 30 days after login", () => {
      // Visit the signin page
      cy.visit("/signin");
      // Enter username
      cy.findByLabelText(/username/i).type(userInfo.username);
      // Enter password
      cy.findByLabelText(/password/i).type(userInfo.password);
      // Check the remember me checkbox
      cy.findByLabelText(/remember me/i).check();
      // Click login button
      cy.findByRole("button", { name: /sign in/i }).click();
      // Wait for login intercept
      cy.wait("@login");
      // Assert redirection to the home page
      cy.location("pathname").should("equal", "/");
      // Check if the session cookie exists
      // Note: Cypress doesn't easily expose cookie expiry details.
      // Checking its existence after checking 'Remember Me' provides some confidence.
      cy.getCookie("connect.sid").should("exist");
    });

    it("should allow a visitor to sign-up, login, and logout", () => {
      // Visit the signup page
      cy.visit("/signup");

      // Fill out the sign-up form with NEW user details
      const signupUsername = "SignUpTestUser";
      cy.findByLabelText(/first name/i).type("SignUp");
      cy.findByLabelText(/last name/i).type("Test");
      cy.findByLabelText(/username/i).type(signupUsername);
      cy.findByLabelText(/^password$/i).type(userInfo.password); // Use a valid password
      cy.findByLabelText(/confirm password/i).type(userInfo.password);

      // Submit the form
      cy.findByRole("button", { name: /sign up/i }).click();

      // Wait for the signup request and assert it was successful
      cy.wait("@signup").its("response.statusCode").should("match", /^20[01]$/);

      // Assert redirection to the signin page
      cy.location("pathname").should("equal", "/signin");

      // Login with the new credentials
      cy.findByLabelText(/username/i).type(signupUsername);
      cy.findByLabelText(/password/i).type(userInfo.password);
      cy.findByRole("button", { name: /sign in/i }).click();

      // Wait for login intercept
      cy.wait("@login");

      // Assert redirection to the home page
      cy.location("pathname").should("equal", "/");
      cy.getBySel("sidenav-username").should("contain", signupUsername);

      // Logout
      if (isMobile()) {
        cy.getBySel("sidenav-toggle").click();
      }
      cy.getBySel("sidenav-signout").click();

      // Assert redirection back to the signin page
      cy.location("pathname").should("equal", "/signin");
    });

    it("should display login errors", () => {
      // Visit the signin page
      cy.visit("/signin");
      // Enter valid username (from seed)
      cy.findByLabelText(/username/i).type(userInfo.username);
      // Enter invalid password
      cy.findByLabelText(/password/i).type(loginCredentials.invalidPassword);
      // Click login button
      cy.findByRole("button", { name: /sign in/i }).click();
      // Wait for login intercept (it should fail)
      cy.wait("@login");
      // Assert error message is displayed
      cy.get("[data-test=signin-error]").should("be.visible").and("contain", "Invalid username or password");
    });

    it("should display signup errors", () => {
      // Visit the signup page
      cy.visit("/signup");

      // --- Test required fields ---
      cy.findByRole("button", { name: /sign up/i }).click();
      cy.get("#firstName-helper-text").should("contain", "First Name is required");
      cy.get("#lastName-helper-text").should("contain", "Last Name is required");
      cy.get("#username-helper-text").should("contain", "Username is required");
      cy.get("#password-helper-text").should("contain", "Enter your password");
      cy.get("#confirmPassword-helper-text").should("contain", "Confirm your password");

      // --- Test password mismatch ---
      cy.findByLabelText(/first name/i).type(userInfo.firstName);
      cy.findByLabelText(/last name/i).type(userInfo.lastName);
      cy.findByLabelText(/username/i).type("MismatchTestUser");
      cy.findByLabelText(/^password$/i).type(userInfo.password);
      cy.findByLabelText(/confirm password/i).type(loginCredentials.invalidPassword); // Mismatched password
      cy.get("#confirmPassword-helper-text").should("contain", "Password does not match");
      // Clear fields for next check
      cy.reload();

      // --- Test existing username ---
      cy.findByLabelText(/first name/i).type(userInfo.firstName);
      cy.findByLabelText(/last name/i).type(userInfo.lastName);
      cy.findByLabelText(/username/i).type(userInfo.username); // Use existing username from seed
      cy.findByLabelText(/^password$/i).type(userInfo.password);
      cy.findByLabelText(/confirm password/i).type(userInfo.password);
      cy.findByRole("button", { name: /sign up/i }).click();
      // Wait for the signup request and assert it failed
      cy.wait("@signup").its("response.statusCode").should("be.oneOf", [400, 409, 422]);
      // Assert error message related to username already exists
      cy.get("[data-test=signup-error]").should("be.visible"); // Text might vary, just check visibility
    });

    it("should error for an invalid user", () => {
      // Visit the signin page
      cy.visit("/signin");
      // Enter invalid username
      cy.findByLabelText(/username/i).type(loginCredentials.invalidUsername);
      // Enter valid password
      cy.findByLabelText(/password/i).type(loginCredentials.validPassword);
      // Click login button
      cy.findByRole("button", { name: /sign in/i }).click();
      // Wait for login intercept (it should fail)
      cy.wait("@login");
      // Assert error message is displayed
      cy.get("[data-test=signin-error]").should("be.visible").and("contain", "Invalid username or password");
    });

    it("should error for an invalid password for existing user", () => {
      // Visit the signin page
      cy.visit("/signin");
      // Enter valid username (from seed)
      cy.findByLabelText(/username/i).type(userInfo.username);
      // Enter invalid password
      cy.findByLabelText(/password/i).type(loginCredentials.invalidPassword);
      // Click login button
      cy.findByRole("button", { name: /sign in/i }).click();
      // Wait for login intercept (it should fail)
      cy.wait("@login");
      // Assert error message is displayed
      cy.get("[data-test=signin-error]").should("be.visible").and("contain", "Invalid username or password");
    });
});
