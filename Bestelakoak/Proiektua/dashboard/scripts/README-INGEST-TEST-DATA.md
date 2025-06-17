# Test Data Ingestion Script

This script processes test execution results and efficiency metrics from two types of files and uploads them to MongoDB collections for the dashboard.

## Overview

The script creates and populates two MongoDB collections:
- `test_execution_results` - Test execution data (pass/fail status, duration, error messages)
- `test_efficiency_metrics` - Command usage and efficiency metrics

## Data Sources

The script processes two types of files:

### 1. Test Results Files
**Location**: `dashboard/data/test_execution_results/executed_tests_results/`  
**Format**: `results_<llm_name>.json`  
**Example**: `results_claude_3_5_sonnet.json`

Contains:
- Test execution results (pass/fail status)
- Test duration
- Error messages and stack traces
- Test metadata (browser, retries, etc.)

### 2. Efficiency Metrics Files
**Location**: `dashboard/data/test_execution_results/test_eficcency_metrics/`  
**Format**: `test-efficiency-metrics_<llm_name>.json`  
**Example**: `test-efficiency-metrics_claude_3_5_sonnet.json`

Contains:
- Command usage per test
- Action types and counts
- Efficiency metrics (commands per test)
- Test complexity analysis

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run ingest-test-data
```

### Option 2: Direct Node.js execution
```bash
node scripts/ingest-test-data.js
```

### Option 3: PowerShell script (Windows)
```powershell
.\scripts\ingest-test-data.ps1
```

### Option 4: With custom MongoDB URI
```bash
MONGODB_URI="mongodb://user:pass@localhost:27017" npm run ingest-test-data
```

## PowerShell Script Options

The PowerShell script includes additional features:

```powershell
# Show help
.\scripts\ingest-test-data.ps1 -Help

# Dry run (show what would be processed)
.\scripts\ingest-test-data.ps1 -DryRun

# Custom MongoDB URI
.\scripts\ingest-test-data.ps1 -MongoUri "mongodb://localhost:27017"
```

## Data Correlation

The script correlates data between the two file types using the filename extracted from the test file path:

```
Test Result: cypress\tests\ui\auth1.spec.ts → auth1.spec.ts
Efficiency Metric: testFiles["auth1.spec.ts"] → Match!
```

## Output Collections

### test_execution_results
```javascript
{
  llm: "claude_3_5_sonnet",
  type: "summary",
  timestamp: ISODate(),
  summary: {
    totalTests: 57,
    passed: 23,
    failed: 35,
    passRate: 40.35,
    executionTime: { start, stop, duration },
    tool: { name: "cypress" }
  },
  tests: [
    {
      llm: "claude_3_5_sonnet",
      testName: "should redirect unauthenticated user to signin page",
      fileName: "auth1.spec.ts",
      filePath: "cypress\\tests\\ui\\auth1.spec.ts",
      status: "failed",
      duration: 24281,
      message: "AssertionError: Timed out retrying...",
      passed: false,
      failed: true
    }
    // ... more tests
  ]
}
```

### test_efficiency_metrics
```javascript
{
  llm: "claude_3_5_sonnet",
  type: "metrics",
  timestamp: ISODate(),
  summary: {
    totalTestFiles: 45,
    totalTestCases: 39,
    totalActionableCommands: 233,
    averageCommandsPerTest: 5.97
  },
  testFiles: {
    "auth1.spec.ts": {
      fileName: "auth1.spec.ts",
      totalTests: 1,
      tests: [
        {
          testName: "should redirect unauthenticated user to signin page",
          actionableCommands: 1,
          commands: ["visit"],
          complexity: "simple"
        }
      ]
    }
    // ... more files
  },
  commandTypes: {
    actionable: ["visit", "click", "type", ...],
    excluded: ["get", "find", "should", ...]
  },
  analysisMetadata: {
    complexityDistribution: { simple: 20, medium: 15, complex: 4 },
    mostUsedCommands: [{ command: "click", count: 45 }, ...],
    leastUsedCommands: [{ command: "submit", count: 1 }, ...]
  }
}
```

## Database Indexes

The script automatically creates indexes for optimal query performance:

**test_execution_results**:
- `{ llm: 1 }`
- `{ type: 1 }`
- `{ 'tests.fileName': 1 }`
- `{ 'tests.status': 1 }`

**test_efficiency_metrics**:
- `{ llm: 1 }`
- `{ type: 1 }`
- `{ 'testFiles': 1 }`

## Error Handling

The script includes comprehensive error handling:
- File validation
- JSON parsing errors
- MongoDB connection issues
- Data processing errors

## Requirements

- Node.js (any recent version)
- MongoDB running locally or accessible via URI
- Required npm packages (already in package.json):
  - `mongodb`
  - `fs` (built-in)
  - `path` (built-in)

## File Structure Expected

```
dashboard/
├── data/
│   └── test_execution_results/
│       ├── executed_tests_results/
│       │   ├── results_claude_3_5_sonnet.json
│       │   ├── results_gpt_4o.json
│       │   └── ...
│       └── test_eficcency_metrics/
│           ├── test-efficiency-metrics_claude_3_5_sonnet.json
│           ├── test-efficiency-metrics_gpt_4o.json
│           └── ...
└── scripts/
    ├── ingest-test-data.js
    └── ingest-test-data.ps1
```

## Troubleshooting

### No data files found
Ensure your files follow the naming convention:
- `results_<llm_name>.json`
- `test-efficiency-metrics_<llm_name>.json`

### MongoDB connection errors
- Ensure MongoDB is running
- Check the connection URI
- Verify network connectivity

### JSON parsing errors
- Validate your JSON files
- Check for proper encoding (UTF-8)
- Ensure files are complete and not truncated

## Next Steps

After running the ingestion script:
1. Start your dashboard application: `npm run dev`
2. Navigate to the Action Usage Analysis section
3. Use the "Refresh Data" button to load the newly ingested information
4. Select different LLMs to view their test results and efficiency metrics
