#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const glob_1 = require("glob");
const analyzer_1 = require("./analyzer");
// Import the constants from analyzer.ts or define them here
const DEFAULT_ACTIONABLE_COMMANDS = [
    'visit',
    'click',
    'type',
    'clear',
    'blur',
    'focus',
    'select',
    'check',
    'uncheck',
    'submit',
    'login',
    'createTransaction',
    'switchUserByXstate',
    'loginByXstate'
];
const program = new commander_1.Command();
program
    .name('cypress-analyzer')
    .description('Analyze Cypress test files for efficiency metrics')
    .version('1.0.0')
    .option('-p, --pattern <glob>', 'Glob pattern to find test files', '**/*.spec.{ts,js}')
    .option('-d, --directory <dir>', 'Directory to search for test files', process.cwd())
    .option('-o, --output <file>', 'Output JSON file', 'test-efficiency-metrics.json')
    .option('-a, --actionable <commands>', 'Comma-separated list of actionable commands')
    .option('-e, --excluded <commands>', 'Comma-separated list of excluded commands')
    .option('-v, --verbose', 'Show verbose output');
// Add a directory argument to handle direct directory paths
program.arguments('[dir]')
    .action((dir) => {
    if (dir) {
        // Trim any extra spaces that might come from command line args
        const trimmedDir = dir.trim();
        const resolvedPath = path.resolve(trimmedDir);
        // Only set the directory if it exists
        if (fs.existsSync(resolvedPath)) {
            program.opts().directory = resolvedPath;
        }
        else {
            console.error(chalk_1.default.red(`Directory not found: ${resolvedPath}`));
            process.exit(1);
        }
    }
});
// Important: Add this to handle --directory with spaces or unusual formatting
program.on('option:directory', function (dirPath) {
    if (dirPath) {
        // Trim any extra spaces that might come from command line args
        const trimmedDir = dirPath.toString().trim();
        const resolvedPath = path.resolve(trimmedDir);
        if (fs.existsSync(resolvedPath)) {
            program.opts().directory = resolvedPath;
        }
        else {
            console.error(chalk_1.default.red(`Directory not found: ${resolvedPath}`));
            process.exit(1);
        }
    }
});
program.parse();
const options = program.opts();
async function run() {
    try {
        console.log(chalk_1.default.blue('Cypress Test Efficiency Analyzer'));
        console.log(chalk_1.default.gray(`Searching for tests in: ${options.directory}`));
        console.log(chalk_1.default.gray(`Using pattern: ${options.pattern}`));
        // Find all the test files based on pattern
        const files = await (0, glob_1.glob)(options.pattern, { cwd: options.directory });
        // Add special handling for files with typos like "spect.ts" instead of "spec.ts"
        const typoFiles = await (0, glob_1.glob)(options.pattern.replace('spec', 'spect'), { cwd: options.directory });
        files.push(...typoFiles);
        if (files.length === 0) {
            console.log(chalk_1.default.yellow('No test files found!'));
            process.exit(1);
        }
        console.log(chalk_1.default.green(`Found ${files.length} test files.`));
        if (options.verbose) {
            files.forEach(file => console.log(chalk_1.default.gray(`- ${file}`)));
            console.log(chalk_1.default.gray(`Actionable commands: ${options.actionable || DEFAULT_ACTIONABLE_COMMANDS.join(',')}`));
        }
        // Parse actionable and excluded commands if provided
        const actionableCommands = options.actionable ? options.actionable.split(',') : undefined;
        const excludedCommands = options.excluded ? options.excluded.split(',') : undefined;
        // Analyze all the files
        const result = (0, analyzer_1.analyzeFiles)(files.map(file => path.join(options.directory, file)), actionableCommands, excludedCommands);
        // Output summary to console
        console.log(chalk_1.default.green('\nAnalysis Summary:'));
        console.log(chalk_1.default.white(`Total Test Files: ${result.summary.totalTestFiles}`));
        console.log(chalk_1.default.white(`Total Test Cases: ${result.summary.totalTestCases}`));
        console.log(chalk_1.default.white(`Total Actionable Commands: ${result.summary.totalActionableCommands}`));
        console.log(chalk_1.default.white(`Average Commands Per Test: ${result.summary.averageCommandsPerTest}`));
        console.log(chalk_1.default.green('\nFile Breakdown:'));
        Object.entries(result.summary.fileBreakdown).forEach(([file, commands]) => {
            console.log(chalk_1.default.white(`${file}: ${commands} commands`));
        });
        // Enhance the output with command type distributions
        console.log(chalk_1.default.green('\nCommand Distribution:'));
        const commandCounts = {};
        Object.values(result.testFiles).forEach(file => {
            Object.values(file.tests).forEach(test => {
                test.commands.forEach(cmd => {
                    commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
                });
            });
        });
        Object.entries(commandCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cmd, count]) => {
            console.log(chalk_1.default.white(`${cmd}: ${count}`));
        });
        // Write output to file
        const outputPath = path.join(process.cwd(), options.output);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(chalk_1.default.green(`\nResults written to: ${outputPath}`));
    }
    catch (error) {
        console.error(chalk_1.default.red('Error during analysis:'), error);
        process.exit(1);
    }
}
run();
