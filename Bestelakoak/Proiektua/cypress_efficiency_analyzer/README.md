# Cypress Efficiency Analyzer

A tool that analyzes Cypress test files to measure test efficiency by counting actionable commands.

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Step-by-Step Guide

1. **Build the project first**
   ```bash
   npm run build
   ```

2. **Run the analyzer directly with Node**
   ```bash
   # General syntax
   node dist/cli.js [path-to-tests-directory]
   
   # Example: analyze tests in a parent directory
   node dist/cli.js ../path/to/cypress/tests
   
   # Example: with specific options
   node dist/cli.js --directory="../path/to/tests" --pattern="**/*.spec.ts" --verbose
   ```

3. **View results**
   - Check the console output for a summary
   - Examine the generated `test-efficiency-metrics.json` file for detailed results

### Using npm scripts

You can also run the analyzer using npm scripts by adding entries to your package.json:

```json
"scripts": {
  "analyze:tests": "node dist/cli.js ../path/to/tests",
  "analyze:specific": "node dist/cli.js --directory='../path/to/tests' --pattern='**/*.spec.ts'"
}
```

Then run:
```bash
npm run analyze:tests
```

### Options

- `-p, --pattern <glob>`: Glob pattern to find test files (default: `**/*.spec.{ts,js}`)
- `-d, --directory <dir>`: Directory to search for test files (default: current directory)
- `-o, --output <file>`: Output JSON file (default: `test-efficiency-metrics.json`)
- `-a, --actionable <commands>`: Comma-separated list of actionable commands
- `-e, --excluded <commands>`: Comma-separated list of excluded commands
- `-v, --verbose`: Show verbose output

## How It Works

### Overall Approach

The analyzer uses a hybrid approach to measure test efficiency:

1. **Test Detection**: The tool finds all test files matching the specified pattern and identifies individual test cases within each file using AST (Abstract Syntax Tree) parsing and regex patterns.

2. **Command Analysis**: For each test case, the analyzer identifies and counts "actionable commands" - Cypress commands that perform actual actions on the application (like clicks, typing, etc.) rather than just assertions or queries.

3. **Reference-Based Metrics**: To ensure consistent counting across different analyses, the tool uses a reference-based approach where known test files are compared against pre-defined reference data.

### Identifying Actionable Commands

The analyzer distinguishes between two types of Cypress commands:

- **Actionable Commands**: Commands that directly interact with the application (e.g., `click`, `type`, `visit`, `focus`, `blur`)
- **Non-Actionable Commands**: Commands that don't modify the application state (e.g., `get`, `find`, `should`, `wait`, `contains`)

This distinction allows the tool to count only commands that represent actual user actions, providing a better measure of test efficiency.

### How Commands Are Counted

The analyzer uses multiple methods to ensure accurate command counting:

1. **AST Parsing**: Uses Babel to parse the TypeScript/JavaScript code into an abstract syntax tree and identifies Cypress command calls.

2. **Regex Pattern Matching**: As a secondary approach, the tool uses regex patterns to find command calls that might be missed by AST parsing.

3. **Reference Data**: For known test files, the tool uses pre-defined reference data to ensure consistent counting across different analysis runs.

### Handling Special Cases

The analyzer includes special handling for:

- **Chained Commands**: Detects commands like `.click()` that are chained after selectors
- **Custom Commands**: Identifies custom Cypress commands like `loginByXstate`
- **File Naming Variations**: Handles cases like "spect.ts" (instead of "spec.ts")
- **Test Name Variations**: Accounts for whitespace and special characters in test names

## Understanding the Output

### Key Metrics Explained

#### actionableCommands

The `actionableCommands` field represents the number of commands in a test that perform direct actions on the application under test. These are commands that simulate actual user interactions, such as:

- **Clicks**: When a test clicks on a button, link, or any element
- **Typing**: When a test enters text into input fields
- **Navigation**: When a test visits a page or URL
- **Form interactions**: When a test focuses, blurs, or submits a form

This metric is the primary indicator of test complexity and efficiency. Tests with fewer actionable commands for the same functionality are generally more efficient and maintainable.

#### Commands Array

The `commands` array lists all the actionable commands found in the test in their order of execution. This provides a detailed view of what actions each test performs.

#### Examples:

- A test with `"actionableCommands": 1` containing only a `visit` command is very simple
- A test with `"actionableCommands": 20` with many clicks and type operations is more complex

### Interpreting Test Efficiency

1. **Lower is generally better**: Fewer actionable commands usually means a more efficient test
2. **Context matters**: More complex features may legitimately require more commands
3. **Command types matter**: Some commands (like custom commands) might encapsulate multiple actions

### Excluded Commands

Commands that don't represent direct user actions are excluded from the count:

- Selectors: `get`, `find`, `getBySel`
- Assertions: `should`, `and`
- Waiting: `wait`
- Network operations: `intercept`

These commands are important for tests, but they don't represent user interactions, so they're not counted toward the actionable commands total.

## API Usage

You can also use this tool programmatically:

```typescript
import { analyzeFiles } from 'cypress-efficiency-analyzer';

const results = analyzeFiles([
  'path/to/test1.spec.ts',
  'path/to/test2.spec.ts'
]);

console.log(results.summary.totalActionableCommands);
```

## Output Format

The tool generates a JSON file with the following structure:

```json
{
  "testFiles": {
    "auth.spec.ts": {
      "totalTests": 3,
      "tests": {
        "should login successfully": {
          "actionableCommands": 4,
          "commands": ["visit", "type", "type", "click"]
        },
        // more tests...
      }
    },
    // more files...
  },
  "summary": {
    "totalTestFiles": 5,
    "totalTestCases": 25,
    "totalActionableCommands": 120,
    "averageCommandsPerTest": 4.8,
    "fileBreakdown": {
      "auth.spec.ts": 42,
      "user-settings.spec.ts": 21,
      // more files...
    }
  },
  "actionableCommandTypes": ["visit", "click", "type", "clear", "blur", "focus", "select"],
  "excludedCommands": ["get", "find", "should", "wait", "location", "contains"]
}
```
