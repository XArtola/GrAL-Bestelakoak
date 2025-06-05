/**
 * Merge Test Execution Results with Efficiency Metrics
 * 
 * This script combines test execution results with test efficiency metrics
 * by matching filePaths from execution results with test file names from efficiency metrics.
 * 
 * Usage:
 *   node scripts/merge-test-results.js --llm claude_3_5_sonnet    # Merge specific LLM
 *   node scripts/merge-test-results.js --all                     # Merge all LLMs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Script initialization...');
console.log(`📄 Script file: ${__filename}`);
console.log(`📁 Script directory: ${__dirname}`);

// Define paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const EXECUTED_TESTS_DIR = path.join(DATA_DIR, 'test_execution_results', 'executed_tests_results');
const EFFICIENCY_METRICS_DIR = path.join(DATA_DIR, 'test_execution_results', 'test_eficcency_metrics');
const OUTPUT_DIR = path.join(DATA_DIR, 'test_execution_results', 'merged_results');

console.log(`📂 Configured paths:`);
console.log(`   DATA_DIR: ${DATA_DIR}`);
console.log(`   EXECUTED_TESTS_DIR: ${EXECUTED_TESTS_DIR}`);
console.log(`   EFFICIENCY_METRICS_DIR: ${EFFICIENCY_METRICS_DIR}`);
console.log(`   OUTPUT_DIR: ${OUTPUT_DIR}`);

// Ensure output directory exists
console.log(`🔍 Checking if output directory exists: ${OUTPUT_DIR}`);
if (!fs.existsSync(OUTPUT_DIR)) {
    console.log(`📁 Creating output directory: ${OUTPUT_DIR}`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Output directory created successfully`);
} else {
    console.log(`✅ Output directory already exists`);
}

/**
 * Extract filename from a file path
 * Example: "cypress\\tests\\ui\\auth1.spec.ts" -> "auth1.spec.ts"
 */
function extractFilename(filePath) {
    if (!filePath) return null;
    
    // Handle both forward and backward slashes
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    return parts[parts.length - 1];
}

/**
 * Merge execution results with efficiency metrics for a specific LLM
 */
function mergeTestData(llmKey) {
    console.log(`🔄 Merging test data for ${llmKey}...`);
    
    // Read execution results
    const executionResultsPath = path.join(EXECUTED_TESTS_DIR, `results_${llmKey}.json`);
    const efficiencyMetricsPath = path.join(EFFICIENCY_METRICS_DIR, `test-efficiency-metrics_${llmKey}.json`);
    
    if (!fs.existsSync(executionResultsPath)) {
        console.error(`❌ Execution results file not found: ${executionResultsPath}`);
        return null;
    }
    
    if (!fs.existsSync(efficiencyMetricsPath)) {
        console.error(`❌ Efficiency metrics file not found: ${efficiencyMetricsPath}`);
        return null;
    }
    
    console.log(`📖 Reading execution results: ${executionResultsPath}`);
    console.log(`📖 Reading efficiency metrics: ${efficiencyMetricsPath}`);
    
    const executionResults = JSON.parse(fs.readFileSync(executionResultsPath, 'utf8'));
    const efficiencyMetrics = JSON.parse(fs.readFileSync(efficiencyMetricsPath, 'utf8'));
    
    console.log(`📊 Execution results: ${executionResults.results?.tests?.length || 0} tests`);
    console.log(`📊 Efficiency metrics: ${Object.keys(efficiencyMetrics.testFiles || {}).length} test files`);
    
    // Create merged data structure
    const mergedData = {
        llm: llmKey,
        timestamp: new Date().toISOString(),
        metadata: {
            source: {
                executionResults: `results_${llmKey}.json`,
                efficiencyMetrics: `test-efficiency-metrics_${llmKey}.json`
            },
            totalTests: executionResults.results?.summary?.tests || 0,
            totalTestFiles: Object.keys(efficiencyMetrics.testFiles || {}).length,
            mergedTests: 0,
            unmatchedTests: 0
        },
        summary: {
            execution: executionResults.results?.summary || {},
            efficiency: efficiencyMetrics.summary || {}
        },
        tests: [],
        testFiles: efficiencyMetrics.testFiles || {},
        actionableCommandTypes: efficiencyMetrics.actionableCommandTypes || [],
        excludedCommands: efficiencyMetrics.excludedCommands || []
    };
    
    // Process each test from execution results
    if (executionResults.results?.tests) {
        console.log(`🔍 Processing ${executionResults.results.tests.length} test execution results...`);
        
        for (const executionTest of executionResults.results.tests) {
            const filename = extractFilename(executionTest.filePath);
            
            if (!filename) {
                console.warn(`⚠️ Could not extract filename from: ${executionTest.filePath}`);
                continue;
            }
            
            // Find matching efficiency data
            const efficiencyData = efficiencyMetrics.testFiles?.[filename];
            let matchedEfficiencyTest = null;
            
            if (efficiencyData && efficiencyData.tests) {
                // Try to match by test name
                matchedEfficiencyTest = efficiencyData.tests[executionTest.name];
                
                if (!matchedEfficiencyTest) {
                    // If no exact match, try to find a partial match
                    const testNames = Object.keys(efficiencyData.tests);
                    const partialMatch = testNames.find(testName => 
                        testName.includes(executionTest.name) || executionTest.name.includes(testName)
                    );
                    
                    if (partialMatch) {
                        matchedEfficiencyTest = efficiencyData.tests[partialMatch];
                        console.log(`🔀 Partial match found: "${executionTest.name}" matched with "${partialMatch}"`);
                    }
                }
            }
            
            // Create merged test object
            const mergedTest = {
                name: executionTest.name,
                filename: filename,
                filePath: executionTest.filePath,
                execution: {
                    status: executionTest.status,
                    duration: executionTest.duration,
                    rawStatus: executionTest.rawStatus,
                    type: executionTest.type,
                    retries: executionTest.retries,
                    flaky: executionTest.flaky,
                    browser: executionTest.browser,
                    message: executionTest.message || null,
                    trace: executionTest.trace || null,
                    attachments: executionTest.attachments || []
                },
                efficiency: matchedEfficiencyTest ? {
                    orderInFile: matchedEfficiencyTest.orderInFile,
                    actionableCommands: matchedEfficiencyTest.actionableCommands,
                    commands: matchedEfficiencyTest.commands || []
                } : null,
                matched: !!matchedEfficiencyTest
            };
            
            mergedData.tests.push(mergedTest);
            
            if (matchedEfficiencyTest) {
                mergedData.metadata.mergedTests++;
            } else {
                mergedData.metadata.unmatchedTests++;
                console.warn(`⚠️ No efficiency data found for test: "${executionTest.name}" in file: ${filename}`);
            }
        }
    }
    
    console.log(`✅ Merged data summary for ${llmKey}:`);
    console.log(`   📊 Total tests: ${mergedData.metadata.totalTests}`);
    console.log(`   🔗 Successfully merged: ${mergedData.metadata.mergedTests}`);
    console.log(`   ⚠️ Unmatched tests: ${mergedData.metadata.unmatchedTests}`);
    console.log(`   📁 Total test files: ${mergedData.metadata.totalTestFiles}`);
    
    return mergedData;
}

/**
 * Save merged data to file
 */
function saveMergedData(mergedData, llmKey) {
    const outputPath = path.join(OUTPUT_DIR, `merged-test-data_${llmKey}.json`);
    
    console.log(`💾 Saving merged data to: ${outputPath}`);
    fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf8');
    
    console.log(`✅ Merged data saved successfully`);
    return outputPath;
}

/**
 * Get list of available LLMs
 */
function getAvailableLLMs() {
    console.log(`🔍 Scanning for available LLMs...`);
    console.log(`   Execution results directory: ${EXECUTED_TESTS_DIR}`);
    console.log(`   Efficiency metrics directory: ${EFFICIENCY_METRICS_DIR}`);
    
    // Check if directories exist
    if (!fs.existsSync(EXECUTED_TESTS_DIR)) {
        console.error(`❌ Execution results directory does not exist: ${EXECUTED_TESTS_DIR}`);
        return [];
    }
    
    if (!fs.existsSync(EFFICIENCY_METRICS_DIR)) {
        console.error(`❌ Efficiency metrics directory does not exist: ${EFFICIENCY_METRICS_DIR}`);
        return [];
    }
    
    const executionFiles = fs.readdirSync(EXECUTED_TESTS_DIR)
        .filter(file => file.startsWith('results_') && file.endsWith('.json'))
        .map(file => file.replace('results_', '').replace('.json', ''));
    
    console.log(`📊 Found ${executionFiles.length} execution result files:`);
    executionFiles.forEach(llm => console.log(`   - results_${llm}.json`));
    
    const efficiencyFiles = fs.readdirSync(EFFICIENCY_METRICS_DIR)
        .filter(file => file.startsWith('test-efficiency-metrics_') && file.endsWith('.json'))
        .map(file => file.replace('test-efficiency-metrics_', '').replace('.json', ''));
    
    console.log(`📊 Found ${efficiencyFiles.length} efficiency metric files:`);
    efficiencyFiles.forEach(llm => console.log(`   - test-efficiency-metrics_${llm}.json`));
    
    // Return intersection of both arrays (LLMs that have both files)
    const availableLLMs = executionFiles.filter(llm => efficiencyFiles.includes(llm));
    console.log(`🔗 LLMs with both file types: ${availableLLMs.length}`);
    availableLLMs.forEach(llm => console.log(`   ✅ ${llm}`));
    
    return availableLLMs;
}

/**
 * Process all available LLMs
 */
function processAllLLMs() {
    const availableLLMs = getAvailableLLMs();
    
    console.log(`🔍 Found ${availableLLMs.length} LLMs with both execution results and efficiency metrics:`);
    availableLLMs.forEach(llm => console.log(`   - ${llm}`));
    
    const results = [];
    
    for (const llmKey of availableLLMs) {
        try {
            const mergedData = mergeTestData(llmKey);
            if (mergedData) {
                const outputPath = saveMergedData(mergedData, llmKey);
                results.push({ llm: llmKey, success: true, outputPath });
            } else {
                results.push({ llm: llmKey, success: false, error: 'Failed to merge data' });
            }
        } catch (error) {
            console.error(`❌ Error processing ${llmKey}:`, error.message);
            results.push({ llm: llmKey, success: false, error: error.message });
        }
        
        console.log(''); // Add spacing between LLMs
    }
    
    return results;
}

/**
 * Main execution logic
 */
function main() {
    console.log(`🎯 Main function called`);
    const args = process.argv.slice(2);
    
    console.log('🚀 Starting Test Data Merger...');
    console.log(`📂 Data directory: ${DATA_DIR}`);
    console.log(`📤 Output directory: ${OUTPUT_DIR}`);
    console.log(`📝 Arguments: ${args.length > 0 ? args.join(' ') : 'No arguments provided'}`);
    console.log(`🔍 Process arguments:`, process.argv);
    
    try {
        if (args.includes('--all')) {
            console.log('📊 Processing all available LLMs...');
            const results = processAllLLMs();
            
            console.log('\\n📋 Summary:');
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            console.log(`✅ Successfully processed: ${successful.length} LLMs`);
            successful.forEach(r => console.log(`   - ${r.llm} → ${path.basename(r.outputPath)}`));
            
            if (failed.length > 0) {
                console.log(`❌ Failed to process: ${failed.length} LLMs`);
                failed.forEach(r => console.log(`   - ${r.llm}: ${r.error}`));
            }
            
        } else if (args.includes('--llm')) {
            const llmIndex = args.indexOf('--llm');
            const llmKey = args[llmIndex + 1];
            
            if (!llmKey) {
                console.error('❌ Please specify an LLM key after --llm');
                process.exit(1);
            }
            
            console.log(`📊 Processing single LLM: ${llmKey}`);
            const mergedData = mergeTestData(llmKey);
            
            if (mergedData) {
                const outputPath = saveMergedData(mergedData, llmKey);
                console.log(`✅ Successfully processed ${llmKey} → ${path.basename(outputPath)}`);
            } else {
                console.error(`❌ Failed to process ${llmKey}`);
                process.exit(1);
            }
            
        } else {
            console.log('📖 Usage:');
            console.log('   node scripts/merge-test-results.js --all                      # Process all LLMs');
            console.log('   node scripts/merge-test-results.js --llm claude_3_5_sonnet   # Process specific LLM');
            console.log('\\n🔍 Available LLMs:');
            const availableLLMs = getAvailableLLMs();
            availableLLMs.forEach(llm => console.log(`   - ${llm}`));
        }
    } catch (error) {
        console.error('❌ Merger failed:', error.message);
        console.error('🔍 Full error stack:', error.stack);
        process.exit(1);
    }
}

// Run if called directly
console.log('🔍 Checking module execution...');
console.log(`   import.meta.url: ${import.meta.url}`);
console.log(`   process.argv[1]: ${process.argv[1]}`);
console.log(`   process.argv[1] normalized: ${process.argv[1].replace(/\\/g, '/')}`);

// Fix URL comparison - add proper file:/// prefix for Windows paths
const normalizedPath = process.argv[1].replace(/\\/g, '/');
const expectedUrl = `file:///${normalizedPath}`;
const actualUrl = import.meta.url;

console.log(`   Expected URL: ${expectedUrl}`);
console.log(`   Actual URL: ${actualUrl}`);

const isDirectCall = actualUrl === expectedUrl;

console.log(`   URLs match: ${isDirectCall}`);
console.log(`   Running direct call check...`);

if (isDirectCall) {
    console.log('✅ Script called directly - running main()');
    main();
} else {
    console.log('⚠️ URL mismatch detected, but this might be a direct call anyway');
    console.log('🔄 Attempting to run main() regardless...');
    main();
}

export { mergeTestData, saveMergedData, getAvailableLLMs };
