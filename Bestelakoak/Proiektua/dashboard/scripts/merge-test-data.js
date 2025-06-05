/**
 * Merge Test Execution Results with Efficiency Metrics
 * 
 * This script combines test execution results with test efficiency metrics
 * by matching filePaths from execution results with test file names from efficiency metrics.
 * 
 * Usage:
 *   node scripts/merge-test-data.js --llm claude_3_5_sonnet    # Merge specific LLM
 *   node scripts/merge-test-data.js --all                      # Merge all LLMs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const EXECUTED_TESTS_DIR = path.join(DATA_DIR, 'test_execution_results', 'executed_tests_results');
const EFFICIENCY_METRICS_DIR = path.join(DATA_DIR, 'test_execution_results', 'test_eficcency_metrics');
const OUTPUT_DIR = path.join(DATA_DIR, 'test_execution_results', 'merged_results');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
 * Process a specific LLM's data
 */
async function processSingleLLM(llmName) {
    console.log(`📊 Processing ${llmName}...`);

    // Define file paths
    const executionFile = path.join(EXECUTED_TESTS_DIR, `results_${llmName}.json`);
    const efficiencyFile = path.join(EFFICIENCY_METRICS_DIR, `test-efficiency-metrics_${llmName}.json`);
    const outputFile = path.join(OUTPUT_DIR, `merged_results_${llmName}.json`);

    // Check if files exist
    if (!fs.existsSync(executionFile)) {
        console.log(`❌ Execution results file not found: ${executionFile}`);
        return null;
    }

    if (!fs.existsSync(efficiencyFile)) {
        console.log(`❌ Efficiency metrics file not found: ${efficiencyFile}`);
        return null;
    }

    try {
        // Read both files
        const executionResults = JSON.parse(fs.readFileSync(executionFile, 'utf8'));
        const efficiencyMetrics = JSON.parse(fs.readFileSync(efficiencyFile, 'utf8'));

        // Merge the data
        const mergedData = mergeTestData(executionResults, efficiencyMetrics, llmName);

        // Ensure output directory exists
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });

        // Write merged data
        fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));

        console.log(`✅ Successfully merged data for ${llmName}`);
        console.log(`   📁 Output: ${outputFile}`);
        console.log(`   📊 Tests processed: ${mergedData.statistics.totalTests}`);
        console.log(`   📈 Tests with efficiency data: ${mergedData.statistics.testsWithEfficiencyData}`);

        return mergedData;

    } catch (error) {
        console.error(`❌ Error processing ${llmName}:`, error.message);
        return null;
    }
}

/**
 * Process all available LLMs
 */
async function processAllLLMs() {
    console.log('🚀 Starting to merge test data for all LLMs...');

    // Get list of available LLMs from execution results
    const llmNames = [];
    if (fs.existsSync(EXECUTED_TESTS_DIR)) {
        const files = fs.readdirSync(EXECUTED_TESTS_DIR);
        files.forEach(file => {
            if (file.startsWith('results_') && file.endsWith('.json')) {
                const llmName = file.replace('results_', '').replace('.json', '');
                llmNames.push(llmName);
            }
        });
    }

    console.log(`📋 Found ${llmNames.length} LLMs to process:`, llmNames);

    const results = [];
    for (const llmName of llmNames) {
        const result = await processSingleLLM(llmName);
        if (result) {
            results.push(result);
        }
    }

    // Create a summary of all merged results
    if (results.length > 0) {
        const summaryFile = path.join(OUTPUT_DIR, 'merge_summary.json');
        const summary = {
            timestamp: new Date().toISOString(),
            totalLLMsProcessed: results.length,
            llms: results.map(r => ({
                name: r.llm,
                totalTests: r.statistics.totalTests,
                testsWithEfficiencyData: r.statistics.testsWithEfficiencyData,
                passRate: r.statistics.executionStats.totalTests > 0 ? 
                    (r.statistics.executionStats.passed / r.statistics.totalTests * 100).toFixed(2) + '%' : '0%',
                avgCommandsPerTest: r.statistics.efficiencyStats.avgCommandsPerTest.toFixed(2)
            }))
        };

        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        console.log(`\n📊 Summary created: ${summaryFile}`);
    }

    console.log(`\n✅ Processing complete! ${results.length} LLMs processed successfully.`);
    return results;
}

/**
 * Main execution logic
 */
async function main() {
    const args = process.argv.slice(2);

    console.log('🔄 Test Data Merger');
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`📂 Script directory: ${__dirname}`);
    console.log(`📊 Data directory: ${DATA_DIR}`);
    console.log(`📄 Executed tests dir: ${EXECUTED_TESTS_DIR}`);
    console.log(`📈 Efficiency metrics dir: ${EFFICIENCY_METRICS_DIR}`);
    console.log(`📤 Output dir: ${OUTPUT_DIR}`);

    try {
        if (args.length > 0 && !args[0].startsWith('--')) {
            // Process specific LLM
            const llmName = args[0];
            await processSingleLLM(llmName);
        } else {
            // Process all LLMs
            await processAllLLMs();
        }
    } catch (error) {
        console.error('❌ Merge operation failed:', error.message);
        console.error('🔍 Full error stack:', error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        console.error('💥 Unhandled error in main:', error);
        process.exit(1);
    });
}

export { mergeTestData, processSingleLLM, processAllLLMs };
