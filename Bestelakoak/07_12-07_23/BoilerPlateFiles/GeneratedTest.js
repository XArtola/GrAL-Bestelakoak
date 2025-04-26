// src/cucumber/code/step_definitions/entities_basic.ts

import { Given, When, Then } from "cucumber";
import { expect } from "chai";
import { World } from "../support/world";

Given("I am working with {string}", async function(this: World, entityType: string) {
  this.entityType = entityType;
});

When("I create a {string} with", async function(this: World, entityType: string, data: string) {
  this.createdEntity = await this.facades.entities.createEntity(entityType, JSON.parse(data));
});

Then("the response status code should be {int}", async function(this: World, statusCode: number) {
  expect(this.createdEntity.response.statusCode).to.equal(statusCode);
});

Then("the response body should contain a property {string} with value {string}", async function(this: World, propertyName: string, expectedValue: string) {
  expect(this.createdEntity.body).to.have.property(propertyName, expectedValue);
});

When("I get the {string} with id {string}", async function(this: World, entityType: string, id: string) {
  this.retrievedEntity = await this.facades.entities.getEntity(entityType, id);
});

Then("the retrieved response status code should be {int}", async function(this: World, statusCode: number) {
  expect(this.retrievedEntity.response.statusCode).to.equal(statusCode);
});

Then("the retrieved response body should contain a property {string} with value {string}", async function(this: World, propertyName: string, expectedValue: string) {
  expect(this.retrievedEntity.body).to.have.property(propertyName, expectedValue);
});

When("I delete the {string} with id {string}", async function(this: World, entityType: string, id: string) {
  this.deletedEntity = await this.facades.entities.deleteEntity(entityType, id);
});

Then("the deleted response status code should be {int}", async function(this: World, statusCode: number) {
  expect(this.deletedEntity.response.statusCode).to.equal(statusCode);
});