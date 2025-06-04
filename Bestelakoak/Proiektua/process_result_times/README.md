# Process Result Times

A Node.js script that processes and analyzes timestamp data from AI model responses, matches timing data, extracts code using AST parsing, and generates comprehensive datasets for analysis.

## Overview

This script is designed to process output from various AI language models (LLMs) by:
1. **Matching timestamps** between different data sources
2. **Extracting code** from response files using Abstract Syntax Tree (AST) parsing
3. **Generating matched datasets** with timing information and extracted code
4. **Creating test identifiers** from file names for easy analysis

## Features

- **Flexible Directory Configuration**: Custom source and output directories
- **Timestamp Matching**: Intelligent matching between timestamp and copilot timing files
- **AST Code Extraction**: Uses Babel parser to extract TypeScript/JavaScript code blocks
- **Multiple Code Pattern Support**: Handles various code block formats and fallback strategies
- **Test ID Generation**: Automatically extracts test identifiers from file names
- **LLM Name Normalization**: Automatically adds normalized LLM names from `normalized_llm_names.json`
- **Comprehensive Error Handling**: Robust error handling with fallback mechanisms

## Prerequisites

- Node.js (version 14 or higher)
- npm packages (automatically installed with `npm install`)
- `normalized_llm_names.json` file in the parent directory (for LLM name mapping)

## Installation

1. Navigate to the script directory:
   ```powershell
   cd process_result_times
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

## Dependencies

```json
{
  "fs-extra": "^11.0.0",
  "moment": "^2.29.4", 
  "@babel/parser": "^7.22.0",
  "@babel/traverse": "^7.22.0",
  "@babel/generator": "^7.22.0"
}
```

Install all dependencies with:
```bash
npm install fs-extra moment @babel/parser @babel/traverse @babel/generator
```

## Quick Start

1. **Install dependencies**: `npm install`
2. **Run with defaults**: `node process_result_times.js`
3. **Check output**: Results will be in the `matched_data/` directory

## Usage

### Basic Usage

Process all output folders with default directories:
```powershell
node process_result_times.js
```

### Command Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--folder` | `-f` | Process only the specified folder (folder name only, not full path) |
| `--ctrf-dir` | `-c` | Specify the directory containing CTRF data |
| `--source-dir` | `-s` | Specify the source directory containing folders to process |
| `--output-dir` | `-o` | Specify the output directory where results will be saved |
| `--help` | `-h` | Show usage information |

### Examples

1. **Process specific folder:**
   ```powershell
   node process_result_times.js -f output_gpt4
   ```

2. **Use custom source directory:**
   ```powershell
   node process_result_times.js -s "C:\path\to\source\data"
   ```

3. **Use custom output directory:**
   ```powershell
   node process_result_times.js -o "C:\path\to\output\results"
   ```

4. **Combine multiple options:**
   ```powershell
   node process_result_times.js -f output_claude_3_5_sonnet -s "..\promp_execution_results" -o "..\processed_prompt_results"
   ```

5. **Full configuration:**
   ```powershell
   node process_result_times.js -f output_gpt4 -c "C:\ctrf\data" -s "C:\source\data" -o "C:\output\results"
   ```

## Script Logic

### Part 1: Timestamp Matching

1. **File Discovery**: Locates timestamp files (`timestamps_*.json`) and copilot timing files (`copilot_timings_*.json`)
2. **Data Loading**: Reads and parses JSON files, handling comment lines
3. **Timestamp Extraction**: Flexibly extracts timestamps from various field names:
   - `timestamp`, `requestTimestamp`, `time`, `ts`
4. **Closest Match Algorithm**: Uses a 5-second tolerance window to find matching timestamps
5. **Test ID Generation**: Extracts test identifiers from file names (e.g., `auth1` from `auth1.spec_response_...`)
6. **LLM Name Resolution**: Maps folder names to normalized LLM names using `normalized_llm_names.json`

### Part 2: Code Extraction (AST-Based)

The script uses a sophisticated multi-step code extraction process:

#### Step 1: Content Isolation
- Extracts blockquoted content (lines starting with `>`)
- Cleans and prepares content for processing

#### Step 2: Code Block Detection
Searches for code in multiple formats:
1. **TypeScript/JavaScript blocks**: ` ```typescript` or ` ```ts`
2. **Generated code tags**: `<generated_code>...</generated_code>`
3. **Generic code blocks**: ` ```\n...\n``` `

#### Step 3: AST Processing
When valid code is found:
1. **Parse**: Uses `@babel/parser` to create an Abstract Syntax Tree
2. **Traverse**: Uses `@babel/traverse` to find specific patterns:
   - `it()` test blocks
   - Function expressions
   - Arrow functions
3. **Extract**: Uses `@babel/generator` to convert AST nodes back to clean code

#### Step 4: Fallback Strategies
- **No `it()` blocks found**: Extracts entire code as generic test
- **AST parsing fails**: Falls back to string extraction
- **No code found**: Returns empty string with error logging

### Data Structure

Each matched entry contains:
```json
{
  "timestamp": "2025-05-21 21:35:03.033",
  "output_file": "output_o4_mini_preview\\new-transaction4.spec_response_o4_mini_preview_20250521_213643.txt",
  "source_file": "C:\\path\\to\\source\\file.txt",
  "requestTimestamp": "2025-05-21 21:35:03.255",
  "requestTimeMs": 1747856103255,
  "responseTimeMs": 1747856189572,
  "durationMs": 86317,
  "testId": "new-transaction4",
  "llmName": "o4-mini (Preview)",
  "llmNormalizedName": "o4_mini_preview",
  "code": "// Extracted TypeScript/JavaScript code..."
}
```

## File Structure

### Input Files

The script expects this structure in the source directory:
```
source_directory/
├── output_model1/
│   ├── timestamps_model1_date.json
│   ├── copilot_timings_model1_date.json
│   └── *.spec_response_model1_timestamp.txt
├── output_model2/
│   └── ...
```

### Output Files

Generated in the output directory:
```
output_directory/
├── matched_data_model1.json
├── matched_data_model2.json
└── ...
```

## Error Handling

The script includes comprehensive error handling:
- **File not found**: Graceful handling with error messages
- **JSON parsing errors**: Automatic comment line removal and retry
- **AST parsing failures**: Fallback to string extraction
- **Missing fields**: Flexible field name detection
- **Directory creation**: Automatic creation of output directories

## Logging

The script provides detailed console output:
- File processing progress
- Timestamp matching results
- Code extraction status
- Error messages and warnings
- Final processing summary

## Troubleshooting

### Common Issues

1. **No matches found (0 matches)**:
   - Check timestamp format compatibility
   - Verify file paths are correct
   - Ensure timestamp files contain valid JSON

2. **Code extraction fails**:
   - Check if response files contain blockquoted content (`>`)
   - Verify code blocks are properly formatted
   - Review console logs for specific parsing errors

3. **Permission errors**:
   - Ensure write permissions for output directory
   - Run PowerShell as administrator if needed

### Debug Mode

For debugging specific issues:
1. Check console output for detailed processing information
2. Verify input file formats match expected structure
3. Test with a single folder using `-f` option
4. Examine intermediate files in matched_data directory

### Validation Steps

After running the script:
1. **Check output files**: Verify files exist in matched_data directory
2. **Verify counts**: Compare number of entries with source files
3. **Inspect code extraction**: Review extracted code for completeness
4. **Test specific entries**: Check timestamp matching accuracy

### Advanced Debugging

For complex issues:
```bash
# Test with specific folder
node process_result_times.js -f output_gpt4

# Use custom directories for isolation
node process_result_times.js -s /test/data -o /test/results

# Check file patterns manually
ls output_*/timestamps_*.json
ls output_*/copilot_timings_*.json
```

## Performance

- **Processing speed**: ~1-5 seconds per model folder (depending on file count)
- **Memory usage**: Low (processes files sequentially)
- **Disk usage**: Output files are typically 10-50% of input size

## Contributing

When modifying the script:
1. Test with various AI model outputs
2. Ensure backward compatibility with existing data formats
3. Add appropriate error handling for new features
4. Update this README with any new functionality

## License

ISC License - see package.json for details.

## Advanced Features

### Timestamp Field Flexibility
The script automatically detects and uses different timestamp field names:
- `timestamp` (primary)
- `requestTimestamp` (fallback 1)
- `time` (fallback 2) 
- `ts` (fallback 3)

### Test ID Extraction Pattern
Test IDs are extracted using this regex pattern:
```javascript
const match = fileName.match(/^(.+?)\.spec_response_/);
// Example: "auth1.spec_response_claude_3_5_sonnet_20250520_204403.txt" → "auth1"
```

### Code Extraction Hierarchy
The script tries multiple extraction methods in order:
1. **TypeScript/TS code blocks** with `it()` functions
2. **Generated code tags** (`<generated_code>...</generated_code>`)
3. **Generic code blocks** without language specification
4. **Fallback string extraction** if AST parsing fails

### LLM Name Normalization
The script automatically maps folder names to standardized LLM names using `normalized_llm_names.json`:
```javascript
// Example mapping:
// "output_claude_3_5_sonnet" → { 
//   "llmName": "Claude 3.5 Sonnet", 
//   "llmNormalizedName": "claude_3_5_sonnet" 
// }
```

This ensures consistent naming across different data sources and analysis tools.

### Matching Algorithm
- **Tolerance**: 5-second window for timestamp matching
- **Uniqueness**: Each copilot timing entry matched only once
- **Closest match**: Finds the timestamp with minimum difference

## Real-World Examples

### Processing Different AI Models

```bash
# Process OpenAI GPT models
node process_result_times.js -f output_gpt4
node process_result_times.js -f output_gpt4_turbo

# Process Anthropic Claude models  
node process_result_times.js -f output_claude_3_5_sonnet
node process_result_times.js -f output_claude_3_haiku

# Process all models at once
node process_result_times.js
```

### Custom Workflow Example

```bash
# 1. Set up custom directories
mkdir /analysis/ai_model_results
mkdir /analysis/processed_data

# 2. Process with custom paths
node process_result_times.js \
  -s "/experiments/model_responses" \
  -o "/analysis/processed_data"

# 3. Process specific subset
node process_result_times.js \
  -f output_claude_3_5_sonnet \
  -s "/experiments/model_responses" \
  -o "/analysis/processed_data"
```

### Integration with Data Analysis

```javascript
// Example: Load processed data for analysis
const fs = require('fs');
const matchedData = JSON.parse(fs.readFileSync('matched_data/matched_data_gpt4.json'));

// Analyze response times by LLM
const avgResponseTime = matchedData.reduce((sum, item) => sum + item.durationMs, 0) / matchedData.length;

// Filter by test type
const authTests = matchedData.filter(item => item.testId.includes('auth'));

// Group by LLM name
const byLlm = matchedData.reduce((acc, item) => {
  const llm = item.llmNormalizedName;
  if (!acc[llm]) acc[llm] = [];
  acc[llm].push(item);
  return acc;
}, {});

// Compare performance across models
Object.keys(byLlm).forEach(llm => {
  const data = byLlm[llm];
  const avgTime = data.reduce((sum, item) => sum + item.durationMs, 0) / data.length;
  console.log(`${llm}: ${avgTime}ms average response time`);
});
```
