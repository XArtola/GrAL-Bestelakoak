#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { glob } from 'glob';
import { analyzeFiles } from './analyzer';

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

const program = new Command();

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
      } else {
        console.error(chalk.red(`Directory not found: ${resolvedPath}`));
        process.exit(1);
      }
    }
  });

// Important: Add this to handle --directory with spaces or unusual formatting
program.on('option:directory', function(dirPath) {
  if (dirPath) {
    // Trim any extra spaces that might come from command line args
    const trimmedDir = dirPath.toString().trim();
    const resolvedPath = path.resolve(trimmedDir);
    if (fs.existsSync(resolvedPath)) {
      program.opts().directory = resolvedPath;
    } else {
      console.error(chalk.red(`Directory not found: ${resolvedPath}`));
      process.exit(1);
    }
  }
});

program.parse();

const options = program.opts();

async function run() {
  try {
    console.log(chalk.blue('Cypress Test Efficiency Analyzer'));
    console.log(chalk.gray(`Searching for tests in: ${options.directory}`));
    console.log(chalk.gray(`Using pattern: ${options.pattern}`));

    // Find all the test files based on pattern
    const files = await glob(options.pattern, { cwd: options.directory });
    
    // Add special handling for files with typos like "spect.ts" instead of "spec.ts"
    const typoFiles = await glob(options.pattern.replace('spec', 'spect'), { cwd: options.directory });
    files.push(...typoFiles);
    
    if (files.length === 0) {
      console.log(chalk.yellow('No test files found!'));
      process.exit(1);
    }
    
    console.log(chalk.green(`Found ${files.length} test files.`));
    if (options.verbose) {
      files.forEach(file => console.log(chalk.gray(`- ${file}`)));
      console.log(chalk.gray(`Actionable commands: ${options.actionable || DEFAULT_ACTIONABLE_COMMANDS.join(',')}`));
    }

    // Parse actionable and excluded commands if provided
    const actionableCommands = options.actionable ? options.actionable.split(',') : undefined;
    const excludedCommands = options.excluded ? options.excluded.split(',') : undefined;
    
    // Analyze all the files
    const result = analyzeFiles(
      files.map(file => path.join(options.directory, file)),
      actionableCommands,
      excludedCommands
    );
    
    // Output summary to console
    console.log(chalk.green('\nAnalysis Summary:'));
    console.log(chalk.white(`Total Test Files: ${result.summary.totalTestFiles}`));
    console.log(chalk.white(`Total Test Cases: ${result.summary.totalTestCases}`));
    console.log(chalk.white(`Total Actionable Commands: ${result.summary.totalActionableCommands}`));
    console.log(chalk.white(`Average Commands Per Test: ${result.summary.averageCommandsPerTest}`));
    
    console.log(chalk.green('\nFile Breakdown:'));
    Object.entries(result.summary.fileBreakdown).forEach(([file, commands]) => {
      console.log(chalk.white(`${file}: ${commands} commands`));
    });
    
    // Enhance the output with command type distributions
    console.log(chalk.green('\nCommand Distribution:'));
    const commandCounts: Record<string, number> = {};
    
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
        console.log(chalk.white(`${cmd}: ${count}`));
      });
    
    // Write output to file
    const outputPath = path.join(process.cwd(), options.output);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(chalk.green(`\nResults written to: ${outputPath}`));
    
  } catch (error) {
    console.error(chalk.red('Error during analysis:'), error);
    process.exit(1);
  }
}

run();
