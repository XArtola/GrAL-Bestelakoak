import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";

const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;

describe("User Sign-up and Login", function () {
  const userInfo = {
    firstName: "Bob",
    lastName: "Ross",
    username: "PainterJoy90",
    password: "s3cret",
  };
  const loginCredentials = {
    validPassword: "s3cret",
    invalidUsername: "invalidUserName",
    invalidPassword: "invalidPa$$word",
    anotherInvalidPassword: "INVALID",
  };

  beforeEach(function () {
    cy.task("db:seed");

    cy.intercept("POST", "/users").as("signup");
    cy.intercept("POST", "/login").as("login");
    cy.intercept("POST", apiGraphQL, (req) => {
      const { body } = req;
      if (body.hasOwnProperty("operationName") && body.operationName === "CreateBankAccount") {
        req.alias = "gqlCreateBankAccountMutation";
      }
    });
  });

  it("should redirect unauthenticated user to signin page", () => {
    // Visit a protected route
    cy.visit("/settings");
    // Assert redirection to signin
    cy.location("pathname").should("equal", "/signin");
    cy.getBySel("signin-username").should("be.visible");
  });

  it("should redirect to the home page after login", () => {
    // Find a user from the database
    cy.database("find", "users").then((user: User) => {
      // Visit signin page
      cy.visit("/signin");
      // Enter username and password
      cy.getBySel("signin-username").type(user.username);
      cy.getBySel("signin-password").type(loginCredentials.validPassword);
      // Click signin button
      cy.getBySel("signin-submit").click();
      // Wait for login request
      cy.wait("@login");
      // Assert redirection to home page
      cy.location("pathname").should("equal", "/");
      cy.getBySel("transaction-list").should("be.visible");
    });
  });

  it("should remember a user for 30 days after login", () => {
    // Find a user from the database
    cy.database("find", "users").then((user: User) => {
      // Visit signin page
      cy.visit("/signin");
      // Enter username and password
      cy.getBySel("signin-username").type(user.username);
      cy.getBySel("signin-password").type(loginCredentials.validPassword);
      // Check remember me
      cy.getBySel("signin-remember-me").check();
      // Click signin button
      cy.getBySel("signin-submit").click();
      // Wait for login request
      cy.wait("@login");
      // Assert redirection to home page
      cy.location("pathname").should("equal", "/");
      // Clear cookies and local storage (simulating closing browser)
      cy.clearCookies();
      cy.clearLocalStorage();
      // Visit the base URL again
      cy.visit("/");
      // Assert user is still logged in (check for username in sidenav)
      cy.getBySel("sidenav-username").should("contain", user.username);
    });
  });

  it("should allow a visitor to sign-up, login, and logout", () => {
    // Visit signup page
    cy.visit("/signup");
    // Fill out signup form
    cy.getBySel("signup-first-name").type(userInfo.firstName);
    cy.getBySel("signup-last-name").type(userInfo.lastName);
    cy.getBySel("signup-username").type(userInfo.username);
    cy.getBySel("signup-password").type(userInfo.password);
    cy.getBySel("signup-confirmPassword").type(userInfo.password);
    // Click signup button
    cy.getBySel("signup-submit").click();
    // Wait for signup request
    cy.wait("@signup");
    // Assert redirection to signin page
    cy.location("pathname").should("equal", "/signin");

    // Login with new credentials
    cy.getBySel("signin-username").type(userInfo.username);
    cy.getBySel("signin-password").type(userInfo.password);
    cy.getBySel("signin-submit").click();
    // Wait for login request
    cy.wait("@login");
    // Assert redirection to home page
    cy.location("pathname").should("equal", "/");
    cy.getBySel("sidenav-username").should("contain", userInfo.username);

    // Logout
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-signout").click();
    // Assert redirection to signin page
    cy.location("pathname").should("equal", "/signin");
  });

  it("should display login errors", () => {
    // Visit signin page
    cy.visit("/signin");
    // Enter invalid username and password
    cy.getBySel("signin-username").type(loginCredentials.invalidUsername);
    cy.getBySel("signin-password").type(loginCredentials.invalidPassword);
    // Click signin button
    cy.getBySel("signin-submit").click();
    // Assert error message is visible
    cy.getBySel("signin-error").should("be.visible").and("contain", "Invalid username or password");
  });

  it("should display signup errors", () => {
    // Visit signup page
    cy.visit("/signup");
    // Fill only first name
    cy.getBySel("signup-first-name").type(userInfo.firstName);
    // Click signup button
    cy.getBySel("signup-submit").click();
    // Assert errors for required fields
    cy.get("#lastName-helper-text").should("contain", "Last Name is required");
    cy.get("#username-helper-text").should("contain", "Username is required");
    cy.get("#password-helper-text").should("contain", "Enter your password");
    cy.get("#confirmPassword-helper-text").should("contain", "Confirm your password");

    // Enter mismatching passwords
    cy.getBySel("signup-password").type(userInfo.password);
    cy.getBySel("signup-confirmPassword").type(loginCredentials.anotherInvalidPassword);
    cy.getBySel("signup-submit").click();
    cy.get("#confirmPassword-helper-text").should("contain", "Password does not match");
  });

  it("should error for an invalid user", () => {
    // Visit signin page
    cy.visit("/signin");
    // Enter invalid username and valid password
    cy.getBySel("signin-username").type(loginCredentials.invalidUsername);
    cy.getBySel("signin-password").type(loginCredentials.validPassword);
    // Click signin button
    cy.getBySel("signin-submit").click();
    // Assert error message is visible
    cy.getBySel("signin-error").should("be.visible").and("contain", "Invalid username or password");
  });

  it("should error for an invalid password for existing user", () => {
    // Find a user from the database
    cy.database("find", "users").then((user: User) => {
      // Visit signin page
      cy.visit("/signin");
      // Enter valid username and invalid password
      cy.getBySel("signin-username").type(user.username);
      cy.getBySel("signin-password").type(loginCredentials.invalidPassword);
      // Click signin button
      cy.getBySel("signin-submit").click();
      // Assert error message is visible
      cy.getBySel("signin-error").should("be.visible").and("contain", "Invalid username or password");
    });
  });
});
