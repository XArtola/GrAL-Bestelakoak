# AST TypeScript Modifier

This project modifies TypeScript test files by replacing variable references with their actual values from a JSON file.

## Overview

The script processes test files (*.spec.ts) in the `ui/complete_tests` directory and subdirectories. It looks for property access expressions (e.g., `userInfo.username`) that match data in the `extracted-test-info.json` file and replaces them with their literal values.

## Prerequisites

- Node.js installed on your machine

## Setup

1. Install dependencies:
   ```
   npm install
   ```

## Usage

Run the script:
```
npm start
```

This will:
1. Iterate through all directories in `ui/complete_tests`
2. Process all `.spec.ts` files in each directory
3. Replace property access expressions with their literal values from `extracted-test-info.json`

## How it works

1. The script reads the JSON file containing test data (`extracted-test-info.json`)
2. For each test file, it identifies the corresponding data in the JSON file based on the filename
3. It parses the TypeScript file to build an AST (Abstract Syntax Tree)
4. It finds property access expressions (e.g., `userInfo.username`) and replaces them with the corresponding literal value from the JSON file
5. The modified content is then written back to the file

## Example

If a file `auth1.spec.ts` contains:
```typescript
cy.getBySel("signin-username").type(userInfo.username);
cy.getBySel("signin-password").type(userInfo.password);
```

And `extracted-test-info.json` contains:
```json
{
  "auth.spec.ts": {
    "userInfo": {
      "username": "PainterJoy90",
      "password": "s3cret"
    }
  }
}
```

The script will transform the file to:
```typescript
cy.getBySel("signin-username").type("PainterJoy90");
cy.getBySel("signin-password").type("s3cret");
```
