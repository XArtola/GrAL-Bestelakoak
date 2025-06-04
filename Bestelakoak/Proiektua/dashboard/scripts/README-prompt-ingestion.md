# Prompt Results Ingestion

This script ingests processed prompt results from the `processed_prompt_results` directory into a MongoDB collection called `test_creation_results`.

## Files

- `ingest-prompt-results.js` - Main ingestion script (Node.js)
- `ingest-prompt-results.ps1` - PowerShell wrapper script
- This README

## Prerequisites

1. **MongoDB** running on localhost:27017 (or configure in `.env`)
2. **Node.js** installed
3. **npm dependencies** installed (`npm install` in dashboard directory)

## Usage

### Option 1: Using npm scripts (Recommended)

```bash
# Full ingestion
npm run ingest-prompt-results

# Show statistics only
npm run ingest-prompt-results:stats

# Clear collection and reingest
npm run ingest-prompt-results:clear
```

### Option 2: Using PowerShell script

```powershell
# Full ingestion
.\scripts\ingest-prompt-results.ps1

# Show statistics only
.\scripts\ingest-prompt-results.ps1 -Stats

# Clear collection first
.\scripts\ingest-prompt-results.ps1 -Clear

# Show help
.\scripts\ingest-prompt-results.ps1 -Help
```

### Option 3: Direct Node.js execution

```bash
# Full ingestion
node scripts/ingest-prompt-results.js

# Show statistics only
node scripts/ingest-prompt-results.js --stats

# Clear and reingest
node scripts/ingest-prompt-results.js --clear

# Show help
node scripts/ingest-prompt-results.js --help
```

## Data Processing

The script:

1. **Scans** `processed_prompt_results/` for `matched_data_*.json` files
2. **Extracts** LLM name from filename (e.g., `claude_3_5_sonnet` from `matched_data_claude_3_5_sonnet.json`)
3. **Processes** each record by adding:
   - `llmNormalizedName` - extracted LLM identifier
   - `sourceFile` - original filename
   - `ingestionTimestamp` - when the record was ingested
   - `timestampDate` / `requestTimestampDate` - converted Date objects
4. **Validates** required fields (`testId`, `code`)
5. **Replaces** existing data for each LLM (no duplicates)
6. **Creates indexes** for performance
7. **Shows statistics** after completion

## Database Schema

Collection: `test_creation_results`

Each document contains:
```json
{
  "_id": "ObjectId",
  "timestamp": "2025-05-20 20:37:46.114",
  "output_file": "output_claude_3_5_sonnet\\transaction-feeds11.spec_response_...",
  "source_file": "C:\\Users\\...\\prompts\\transaction-feeds11.spec.txt",
  "requestTimestamp": "2025-05-20 20:37:46.321",
  "requestTimeMs": 1747766266321,
  "responseTimeMs": 1747766297231,
  "durationMs": 30910,
  "testId": "transaction-feeds11",
  "llmName": "Claude 3.5 Sonnet",
  "llmNormalizedName": "claude_3_5_sonnet",
  "code": "// Generated test code...",
  "sourceFile": "matched_data_claude_3_5_sonnet.json",
  "ingestionTimestamp": "2025-06-04T...",
  "timestampDate": "2025-05-20T20:37:46.114Z",
  "requestTimestampDate": "2025-05-20T20:37:46.321Z"
}
```

## Database Indexes

The script creates the following indexes for optimal query performance:

- `testId`
- `llmNormalizedName` 
- `timestampDate`
- `durationMs`
- `{ llmNormalizedName: 1, testId: 1 }` (compound)
- `{ timestampDate: 1, llmNormalizedName: 1 }` (compound)

## Configuration

Database settings in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=tests
```

## Troubleshooting

### Common Issues

1. **MongoDB not running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:27017
   ```
   Solution: Start MongoDB service

2. **Data directory not found**
   ```
   Directory not found: ...processed_prompt_results
   ```
   Solution: Ensure the `processed_prompt_results` directory exists

3. **Permission denied**
   ```
   Error: EACCES: permission denied
   ```
   Solution: Run PowerShell as Administrator or check file permissions

### Verification

After ingestion, verify data:

```javascript
// Connect to MongoDB
use tests

// Count documents
db.test_creation_results.countDocuments()

// Check LLM distribution
db.test_creation_results.aggregate([
  { $group: { _id: "$llmNormalizedName", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])

// Sample document
db.test_creation_results.findOne()
```
