# Database Collection for Merged Test Data

This directory contains scripts for saving merged test execution results and efficiency metrics into a MongoDB database collection.

## Overview

The database collection system allows you to:
- Save merged test data from JSON files into MongoDB
- Store comprehensive test execution and efficiency metrics
- Query and analyze test results across different LLMs
- Maintain historical test data for trend analysis

## Prerequisites

1. **MongoDB Installation**: 
   - Install MongoDB locally, or
   - Use MongoDB Atlas cloud service

2. **Node.js Dependencies**:
   ```bash
   npm install mongodb dotenv
   ```

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure your MongoDB connection in `.env.local`:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=test_results_db
   MONGODB_COLLECTION=merged_test_data
   ```

## Usage

### Save Data to Database

Save all available LLM data:
```bash
npm run save-to-db:all
```

Save specific LLM data:
```bash
npm run save-to-db -- --llm=claude_3_5_sonnet
```

Reset collection and save all data:
```bash
npm run save-to-db:reset
```

Show collection statistics:
```bash
npm run save-to-db:stats
```

### Direct Script Usage

```bash
# Save all LLMs
node scripts/save-to-database.js --all

# Save specific LLM
node scripts/save-to-database.js --llm=claude_3_5_sonnet

# Clear collection and resave all data
node scripts/save-to-database.js --reset

# Show statistics only
node scripts/save-to-database.js --stats
```

## Data Structure

Each document in the collection contains:

```json
{
  "_id": "merged_test_data_claude_3_5_sonnet",
  "llm": "claude_3_5_sonnet",
  "timestamp": "2025-06-05T11:15:59.361Z",
  "insertedAt": "2025-06-05T12:30:00.000Z",
  "version": "1.0",
  
  "metadata": {
    "source": {
      "executionResults": "results_claude_3_5_sonnet.json",
      "efficiencyMetrics": "test-efficiency-metrics_claude_3_5_sonnet.json"
    },
    "totalTests": 57,
    "totalTestFiles": 45,
    "mergedTests": 37,
    "unmatchedTests": 20,
    "processingInfo": {
      "originalTimestamp": "2025-06-05T11:15:59.361Z",
      "databaseInsertTimestamp": "2025-06-05T12:30:00.000Z",
      "dataVersion": "1.0"
    }
  },
  
  "summary": {
    "execution": {
      "tests": 57,
      "failed": 35,
      "passed": 23,
      "skipped": 0,
      "pending": 0,
      "other": 0
    },
    "efficiency": {
      "totalTestFiles": 45,
      "totalTestCases": 39,
      "totalActionableCommands": 233,
      "averageCommandsPerTest": 5.97
    }
  },
  
  "statistics": {
    "execution": {
      "totalTests": 57,
      "passRate": "40.35",
      "failRate": "61.40",
      "averageDuration": 15234
    },
    "efficiency": {
      "totalTestFiles": 45,
      "totalTestCases": 39,
      "totalActionableCommands": 233,
      "averageCommandsPerTest": 5.97,
      "mergeSuccessRate": "64.91"
    }
  },
  
  "tests": [
    {
      "name": "User Sign-up and Login should redirect unauthenticated user to signin page",
      "filename": "auth1.spec.ts",
      "filePath": "cypress\\tests\\ui\\auth1.spec.ts",
      "execution": {
        "status": "failed",
        "duration": 24281,
        "type": "e2e",
        "retries": 2,
        "flaky": false,
        "browser": "electron 130.0.6723.137",
        "message": "AssertionError: Timed out retrying...",
        "attachments": [...]
      },
      "efficiency": {
        "orderInFile": 1,
        "actionableCommands": 1,
        "commands": ["visit"]
      }
    }
  ]
}
```

## Database Schema

### Collection: `merged_test_data`

**Indexes Created:**
- `llm` (1)
- `metadata.totalTests` (1)
- `summary.execution.tests` (1)
- `summary.execution.passed` (1)
- `summary.execution.failed` (1)
- `statistics.execution.passRate` (1)
- `insertedAt` (1)
- `timestamp` (1)

## Querying Examples

### MongoDB Shell Examples

```javascript
// Find all LLMs
db.merged_test_data.distinct("llm")

// Find LLMs with pass rate > 50%
db.merged_test_data.find({
  "statistics.execution.passRate": { $gt: "50.00" }
})

// Get statistics for all LLMs
db.merged_test_data.aggregate([
  {
    $group: {
      _id: null,
      avgPassRate: { $avg: { $toDouble: "$statistics.execution.passRate" } },
      avgMergeRate: { $avg: { $toDouble: "$statistics.efficiency.mergeSuccessRate" } },
      totalTests: { $sum: "$summary.execution.tests" }
    }
  }
])

// Compare LLM performance
db.merged_test_data.find({}, {
  llm: 1,
  "statistics.execution.passRate": 1,
  "statistics.efficiency.mergeSuccessRate": 1,
  "summary.execution.tests": 1
}).sort({ "statistics.execution.passRate": -1 })
```

### Node.js Query Examples

```javascript
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('test_results_db');
const collection = db.collection('merged_test_data');

// Get all LLMs sorted by pass rate
const results = await collection.find({}, {
  projection: {
    llm: 1,
    'statistics.execution.passRate': 1,
    'summary.execution.tests': 1
  }
}).sort({ 'statistics.execution.passRate': -1 }).toArray();

// Find best performing LLM
const bestLLM = await collection.findOne({}, {
  sort: { 'statistics.execution.passRate': -1 }
});

// Get aggregated statistics
const stats = await collection.aggregate([
  {
    $group: {
      _id: null,
      avgPassRate: { $avg: { $toDouble: '$statistics.execution.passRate' } },
      totalTests: { $sum: '$summary.execution.tests' },
      llmCount: { $sum: 1 }
    }
  }
]).toArray();
```

## Features

- **Automatic Data Transformation**: Raw merged data is enhanced with computed statistics
- **Upsert Operations**: Safely replace existing data or insert new records
- **Index Optimization**: Automatically creates indexes for common query patterns
- **Error Handling**: Comprehensive error handling and logging
- **Statistics**: Built-in collection statistics and reporting
- **Flexible Configuration**: Environment-based configuration for different deployments

## Troubleshooting

### Connection Issues
```bash
# Check if MongoDB is running
mongosh

# Test connection with script
node scripts/save-to-database.js --stats
```

### Data Issues
```bash
# Check merged data files exist
ls data/test_execution_results/merged_results/

# Regenerate merged data if needed
npm run merge-results:all
```

### Permissions
Make sure your MongoDB user has read/write permissions to the target database.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DATABASE` | `test_results_db` | Database name |
| `MONGODB_COLLECTION` | `merged_test_data` | Collection name |
| `MONGODB_MAX_POOL_SIZE` | `10` | Connection pool size |
| `MONGODB_SERVER_SELECTION_TIMEOUT` | `5000` | Server selection timeout (ms) |
| `MONGODB_SOCKET_TIMEOUT` | `45000` | Socket timeout (ms) |
