// test/tests/debugSteps.tests.ts
import { it, describe } from 'mocha';
import * as Chai from 'chai';
const expect = require('chai').expect as Chai.ExpectStatic;

import { TestUtils } from "../../testInfra/utils";
import { TestAutomationInfrastructure } from "../../testInfra/testClasses/TestAutomationInfrastructure";
import { getConfig } from "../../../src/configurationManager/configurationManager";
import { CucumberResultParser } from "../../testInfra/cucumberResultParser";

const testUtils = new TestUtils();

describe('Debug steps', async () => {
    const workPath = testUtils.prepareAutomationRunWorkPath();
    TestAutomationInfrastructure.destroyInstance();
    const infra = new TestAutomationInfrastructure(workPath, getConfig([`${workPath}/config/master.ts`]));

    let runResults: CucumberResultParser;

    before(async () => {
        await testUtils.runAutomation(infra, { workPath, tags: '@debug' });
        runResults = testUtils.parseResults(workPath);
        testUtils.deleteTestDataPath(workPath);
    });

    it('Runs simple steps', () => {
        const simpleStepsScenario = runResults.getScenario('Running simple steps');
        expect(runResults.getScenarioStatus(simpleStepsScenario)).to.equal('passed');
    });

    it('Skips skipped steps', () => {
        const skippedStepScenario = runResults.getScenario('Running a step that should be skipped');
        expect(runResults.getScenarioStatus(skippedStepScenario)).to.equal('skipped');
    });

    it('Can eval and print variables', () => {
        const evalAndPrintScenario = runResults.getScenario('Eval and print');
        expect(runResults.getScenarioStatus(evalAndPrintScenario)).to.equal('passed');
    });

});

// test/tests/entityManagement.tests.ts
import { it, describe } from 'mocha';
import * as Chai from 'chai';
const expect = require('chai').expect as Chai.ExpectStatic;

import { TestUtils } from "../../testInfra/utils";
import { TestAutomationInfrastructure } from "../../testInfra/testClasses/TestAutomationInfrastructure";
import { getConfig } from "../../../src/configurationManager/configurationManager";
import { CucumberResultParser } from "../../testInfra/cucumberResultParser";

const testUtils = new TestUtils();

describe('Entity management', async () => {
    const workPath = testUtils.prepareAutomationRunWorkPath();
    TestAutomationInfrastructure.destroyInstance();
    const infra = new TestAutomationInfrastructure(workPath, getConfig([`${workPath}/config/master.ts`]));

    let runResults: CucumberResultParser;

    before(async () => {
        await testUtils.runAutomation(infra, { workPath, tags: '@entities_basic or @entities_full_crud' });
        runResults = testUtils.parseResults(workPath);
        testUtils.deleteTestDataPath(workPath);
    });

    it('Can perform basic entity operations', () => {
        const basicEntityOperationsScenario = runResults.getScenario('Basic entity operations');
        expect(runResults.getScenarioStatus(basicEntityOperationsScenario)).to.equal('passed');
    });

    it('Can create, delete, get and validate entities', () => {
        const fullCrudOperationsScenario = runResults.getScenario('Creating, Deleting, Getting and Validating entities');
        expect(runResults.getScenarioStatus(fullCrudOperationsScenario)).to.equal('passed');
    });

});

// test/tests/metaStepManipulations.tests.ts
import { it, describe } from 'mocha';
import * as Chai from 'chai';
const expect = require('chai').expect as Chai.ExpectStatic;

import { TestUtils } from "../../testInfra/utils";
import { TestAutomationInfrastructure } from "../../testInfra/testClasses/TestAutomationInfrastructure";
import { getConfig } from "../../../src/configurationManager/configurationManager";
import { CucumberResultParser } from "../../testInfra/cucumberResultParser";

const testUtils = new TestUtils();

describe('Meta Step manipulations', async () => {
    const workPath = testUtils.prepareAutomationRunWorkPath();
    TestAutomationInfrastructure.destroyInstance();
    const infra = new TestAutomationInfrastructure(workPath, getConfig([`${workPath}/config/master.ts`]));

    let runResults: CucumberResultParser;

    before(async () => {
        await testUtils.runAutomation(infra, { workPath, tags: '@meta_step_manipulations' });
        runResults = testUtils.parseResults(workPath);
        testUtils.deleteTestDataPath(workPath);
    });

    it('Can modify step result and execution time', () => {
        const scenario = runResults.getScenario('Modifying step results and execution time');
        expect(runResults.getScenarioStatus(scenario)).to.equal('passed');
    });

});

// test/tests/variables.tests.ts
import { it, describe } from 'mocha';
import * as Chai from 'chai';
const expect = require('chai').expect as Chai.ExpectStatic;

import { TestUtils } from "../../testInfra/utils";
import { TestAutomationInfrastructure } from "../../testInfra/testClasses/TestAutomationInfrastructure";
import { getConfig } from "../../../src/configurationManager/configurationManager";
import { CucumberResultParser } from "../../testInfra/cucumberResultParser";

const testUtils = new TestUtils();

describe('Variables', async () => {
    const workPath = testUtils.prepareAutomationRunWorkPath();
    TestAutomationInfrastructure.destroyInstance();
    const infra = new TestAutomationInfrastructure(workPath, getConfig([`${workPath}/config/master.ts`]));

    let runResults: CucumberResultParser;

    before(async () => {
        await testUtils.runAutomation(infra, { workPath, tags: '@variables' });
        runResults = testUtils.parseResults(workPath);
        testUtils.deleteTestDataPath(workPath);
    });

    it('Handles variables usage and edge cases', () => {
        const scenario = runResults.getScenario('Variables usage and edge cases');
        expect(runResults.getScenarioStatus(scenario)).to.equal('passed');
    });

});