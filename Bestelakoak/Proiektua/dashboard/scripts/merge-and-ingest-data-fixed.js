import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'llm_testing_dashboard';
const COLLECTION_NAME = 'merged_llm_test_data'; // New merged collection

// Data directories
const RESULTS_DIR = path.join(__dirname, '../data/test_execution_results/executed_tests_results');
const METRICS_DIR = path.join(__dirname, '../data/test_execution_results/test_eficcency_metrics');

// Normalize LLM names
const LLM_NAME_MAPPING = {
  'claude_3_5_sonnet': 'claude_3_5_sonnet',
  'claude_3_7_sonnet': 'claude_3_7_sonnet', 
  'claude_3_7_thinking': 'claude_3_7_sonnet_thinking',
  'claude_sonnet_4': 'claude_sonnet_4',
  'gemini_2_0_flash': 'gemini_2_0_flash',
  'gemini_2_5_pro_preview': 'gemini_2_5_pro_preview',
  'gpt_4_1': 'gpt_4_1',
  'gpt_4o': 'gpt_4o',
  'o3_mini': 'o3_mini',
  'o4_mini-preview': 'o4_mini_preview',
  'original': 'original'
};

function normalizeLLMName(fileName) {
  // Extract LLM name from filename
  const resultMatch = fileName.match(/^results_(.+)\.json$/);
  const metricMatch = fileName.match(/^test-efficiency-metrics_(.+)\.json$/);
  
  if (resultMatch) {
    return LLM_NAME_MAPPING[resultMatch[1]] || resultMatch[1];
  }
  if (metricMatch) {
    return LLM_NAME_MAPPING[metricMatch[1]] || metricMatch[1];
  }
  
  return null;
}

function findTestMetrics(testFiles, filename, fullTestName) {
  const fileMetrics = testFiles[filename];
  if (!fileMetrics) {
    return null;
  }

  // In the new structure, each file has a single test_name and metrics
  const storedTestName = fileMetrics.test_name;
  
  // Helper function to normalize test names for comparison
  const normalizeTestName = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')                    // Normalize whitespace
      .replace(/[^\w\s]/g, '')                 // Remove special characters
      .replace(/\s*\(\d+\)$/, '')              // Remove (1), (2), etc.
      .replace(/\s*-\s*run\s*\d+$/i, '')       // Remove "- run 1", "- run 2", etc.
      .replace(/\s*#\d+$/, '')                 // Remove "#1", "#2", etc.
      .replace(/\s*\[\d+\]$/, '')              // Remove [1], [2], etc.
      .replace(/\s*_\d+$/, '')                 // Remove _1, _2, etc.
      .replace(/\s*:\s*\d+$/, '')              // Remove : 1, : 2, etc.
      .replace(/\s*iteration\s*\d+$/i, '')     // Remove "iteration 1", etc.
      .replace(/\s*attempt\s*\d+$/i, '')       // Remove "attempt 1", etc.
      .replace(/\s*retry\s*\d+$/i, '')         // Remove "retry 1", etc.
      .replace(/\s*execution\s*\d+$/i, '')     // Remove "execution 1", etc.
      .trim();
  };
  
  const normalizedFullTest = normalizeTestName(fullTestName);
  const normalizedStoredTest = normalizeTestName(storedTestName);
  
  // 1. Try exact match first
  if (storedTestName === fullTestName) {
    return fileMetrics;
  }
  
  // 2. Try normalized exact match
  if (normalizedStoredTest === normalizedFullTest) {
    return fileMetrics;
  }
  
  // 3. Try removing common prefixes (like "User Settings ", "Transaction View ", etc.)
  const cleanTestName = fullTestName.replace(/^[A-Z][a-z ]+\s+/, '');
  if (cleanTestName !== fullTestName && storedTestName === cleanTestName) {
    return fileMetrics;
  }
  
  // 4. Try finding if stored test name appears at the end of the full name
  if (fullTestName.endsWith(storedTestName) && storedTestName.length > 10) {
    return fileMetrics;
  }
  
  // 5. Try partial matching (stored test name appears within full name)
  if (fullTestName.includes(storedTestName) && storedTestName.length > 15) {
    return fileMetrics;
  }
  
  // 6. Try case-insensitive matching
  const lowerFullTestName = fullTestName.toLowerCase();
  if (storedTestName.toLowerCase() === lowerFullTestName) {
    return fileMetrics;
  }
  
  // 7. Try reverse partial matching (full name appears within stored test name)
  if (storedTestName.includes(fullTestName) && fullTestName.length > 15) {
    return fileMetrics;
  }
  
  // 8. Try normalized partial matching
  if (normalizedStoredTest.includes(normalizedFullTest) && normalizedFullTest.length > 10) {
    return fileMetrics;
  }
  
  if (normalizedFullTest.includes(normalizedStoredTest) && normalizedStoredTest.length > 10) {
    return fileMetrics;
  }
  
  return null;
}

async function mergeDataForLLM(llmName, resultsData, metricsData) {
  
  if (!resultsData) {
    return null;
  }
  
  // Start with the original CTRF structure
  const mergedData = {
    llm: llmName,
    timestamp: new Date().toISOString(),
    ...resultsData // Spread all original CTRF data
  };
  
  // If we have metrics data, enhance each test with actionableCommands and commands
  if (metricsData && metricsData.testFiles && mergedData.results && mergedData.results.tests) {
    
    let enhancedCount = 0;
    let notFoundTests = []; // Track tests that don't find matches
    
    // First pass: Group tests by their base name and filename to identify repeated executions
    const testGroups = new Map();
    
    mergedData.results.tests.forEach((test, index) => {
      const filename = test.filePath ? test.filePath.replace(/\\/g, '/').split('/').pop() : '';
      const testName = test.name || '';
      
      if (!filename || !testName) return;
      
      // Clean test name for dynamic executions
      const baseTestName = testName
        .replace(/\s*\(\d+\)$/, '')              // Remove (1), (2), etc.
        .replace(/\s*-\s*run\s*\d+$/i, '')       // Remove "- run 1", "- run 2", etc.
        .replace(/\s*#\d+$/, '')                 // Remove "#1", "#2", etc.
        .replace(/\s*\[\d+\]$/, '')              // Remove [1], [2], etc.
        .replace(/\s*_\d+$/, '')                 // Remove _1, _2, etc.
        .replace(/\s*:\s*\d+$/, '')              // Remove : 1, : 2, etc.
        .replace(/\s*iteration\s*\d+$/i, '')     // Remove "iteration 1", "iteration 2", etc.
        .replace(/\s*attempt\s*\d+$/i, '')       // Remove "attempt 1", "attempt 2", etc.
        .replace(/\s*retry\s*\d+$/i, '')         // Remove "retry 1", "retry 2", etc.
        .replace(/\s*execution\s*\d+$/i, '')     // Remove "execution 1", "execution 2", etc.
        .trim();
      
      const groupKey = `${filename}::${baseTestName}`;
      
      if (!testGroups.has(groupKey)) {
        testGroups.set(groupKey, {
          filename,
          baseTestName,
          originalTestName: testName,
          tests: [],
          metrics: null
        });
      }
      
      testGroups.get(groupKey).tests.push({ test, index, originalName: testName });
    });
    
    // Second pass: Find metrics for each group
    for (const [groupKey, group] of testGroups) {
      let testMetrics = null;
      
      // Try to find metrics for this group using the base test name
      testMetrics = findTestMetrics(metricsData.testFiles, group.filename, group.baseTestName);
      
      // If not found with base name, try with original name
      if (!testMetrics) {
        testMetrics = findTestMetrics(metricsData.testFiles, group.filename, group.originalTestName);
      }
      
      // If still not found, try additional cleaning strategies
      if (!testMetrics) {
        const extraCleanedName = group.baseTestName
          .replace(/\s*\(.*?\)$/, '')          // Remove anything in parentheses at the end
          .replace(/\s*\[.*?\]$/, '')          // Remove anything in brackets at the end
          .replace(/\s*\{.*?\}$/, '')          // Remove anything in braces at the end
          .replace(/\s*-\s*\d+$/, '')          // Remove "- 1", "- 2", etc.
          .replace(/\s*_+\d+$/, '')            // Remove "_1", "__2", etc.
          .replace(/\s*copy\s*\d*$/i, '')      // Remove "copy", "copy 1", etc.
          .replace(/\s*duplicate\s*\d*$/i, '') // Remove "duplicate", "duplicate 1", etc.
          .trim();
          
        if (extraCleanedName !== group.baseTestName) {
          testMetrics = findTestMetrics(metricsData.testFiles, group.filename, extraCleanedName);
        }
      }
      
      group.metrics = testMetrics;
    }
    
    // Third pass: Apply metrics to all tests
    mergedData.results.tests = mergedData.results.tests.map((test, index) => {
      const filename = test.filePath ? test.filePath.replace(/\\/g, '/').split('/').pop() : '';
      const testName = test.name || '';
      
      if (!filename || !testName) {
        return {
          ...test,
          actionableCommands: 0,
          commands: [],
          commandCounts: {},
          metricsFound: false
        };
      }
      
      // Find the group this test belongs to
      const baseTestName = testName
        .replace(/\s*\(\d+\)$/, '')              // Remove (1), (2), etc.
        .replace(/\s*-\s*run\s*\d+$/i, '')       // Remove "- run 1", "- run 2", etc.
        .replace(/\s*#\d+$/, '')                 // Remove "#1", "#2", etc.
        .replace(/\s*\[\d+\]$/, '')              // Remove [1], [2], etc.
        .replace(/\s*_\d+$/, '')                 // Remove _1, _2, etc.
        .replace(/\s*:\s*\d+$/, '')              // Remove : 1, : 2, etc.
        .replace(/\s*iteration\s*\d+$/i, '')     // Remove "iteration 1", "iteration 2", etc.
        .replace(/\s*attempt\s*\d+$/i, '')       // Remove "attempt 1", "attempt 2", etc.
        .replace(/\s*retry\s*\d+$/i, '')         // Remove "retry 1", "retry 2", etc.
        .replace(/\s*execution\s*\d+$/i, '')     // Remove "execution 1", "execution 2", etc.
        .trim();
      
      const groupKey = `${filename}::${baseTestName}`;
      const group = testGroups.get(groupKey);
      
      if (group && group.metrics) {
        enhancedCount++;
        
        // Convert the commands object to an array format for backward compatibility
        const commandsArray = [];
        if (group.metrics.commands && typeof group.metrics.commands === 'object') {
          for (const [command, count] of Object.entries(group.metrics.commands)) {
            for (let i = 0; i < count; i++) {
              commandsArray.push(command);
            }
          }
        }
        
        return {
          ...test,
          actionableCommands: group.metrics.actionableCommands || 0,
          commands: commandsArray,
          commandCounts: group.metrics.commands || {},
          metricsFound: true,
          baseTestName: baseTestName, // Keep track of the base test name used for grouping
          isRepeatedExecution: baseTestName !== testName // Flag to indicate if this is a repeated execution
        };
      } else {
        // Log the test that didn't find a match (only once per group to avoid spam)
        if (!group || group.tests[0].index === index) { // Only log for the first test in each group
          notFoundTests.push({
            filename: filename,
            testName: testName,
            baseTestName: baseTestName,
            index: index + 1,
            groupSize: group ? group.tests.length : 1
          });
        }
        
        return {
          ...test,
          actionableCommands: 0,
          commands: [],
          commandCounts: {},
          metricsFound: false,
          baseTestName: baseTestName,
          isRepeatedExecution: baseTestName !== testName
        };
      }
    });
    
    // Log tests that didn't find matches
    if (notFoundTests.length > 0) {
      console.log(`\n⚠️ ${llmName}: ${notFoundTests.length} test groups without metrics found:`);
      notFoundTests.slice(0, 10).forEach(test => { // Show first 10
        const groupInfo = test.groupSize > 1 ? ` (${test.groupSize} executions)` : '';
        console.log(`   📁 ${test.filename} - "${test.testName}"${groupInfo}`);
        if (test.baseTestName !== test.testName) {
          console.log(`      Base: "${test.baseTestName}"`);
        }
      });
      if (notFoundTests.length > 10) {
        console.log(`   ... and ${notFoundTests.length - 10} more`);
      }
    }
    
    console.log(`✅ ${llmName}: Enhanced ${enhancedCount}/${mergedData.results.tests.length} tests with metrics`);
    
    // Add summary metrics to the results summary
    if (metricsData.summary) {
      mergedData.results.summary.totalActionableCommands = metricsData.summary.totalActionableCommands || 0;
      mergedData.results.summary.averageCommandsPerTest = metricsData.summary.averageCommandsPerTest || 0;
      mergedData.results.summary.totalTestCases = metricsData.summary.totalTestCases || 0;
    }
    
    // Add metrics metadata if available
    if (metricsData.analysisMetadata) {
      mergedData.results.metricsMetadata = metricsData.analysisMetadata;
    }
    
    if (metricsData.commandTypes) {
      mergedData.results.commandTypes = metricsData.commandTypes;
    }
    
  } else {
    console.log(`⚠️ ${llmName}: No metrics data available - all tests will have 0 actionableCommands`);
    
    // Add default values for actionableCommands and commands to all tests
    if (mergedData.results && mergedData.results.tests) {
      mergedData.results.tests = mergedData.results.tests.map(test => ({
        ...test,
        actionableCommands: 0,
        commands: [],
        commandCounts: {},
        metricsFound: false
      }));
    }
  }
  
  console.log(`✅ Merge completed for ${llmName}`);
  return mergedData;
}

async function loadAndMergeData() {
  
  const resultsFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
  const metricsFiles = fs.readdirSync(METRICS_DIR).filter(f => f.endsWith('.json'));
  
  const llmDataMap = new Map();
  
  // Load results files
  for (const file of resultsFiles) {
    const llmName = normalizeLLMName(file);
    if (!llmName) {
      continue;
    }
    
    const filePath = path.join(RESULTS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!llmDataMap.has(llmName)) {
      llmDataMap.set(llmName, {});
    }
    llmDataMap.get(llmName).results = data;
  }
  
  // Load metrics files
  for (const file of metricsFiles) {
    const llmName = normalizeLLMName(file);
    if (!llmName) {
      continue;
    }
    
    const filePath = path.join(METRICS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!llmDataMap.has(llmName)) {
      llmDataMap.set(llmName, {});
    }
    llmDataMap.get(llmName).metrics = data;
  }  
  console.log(`📊 Collected data for ${llmDataMap.size} LLMs:`, Array.from(llmDataMap.keys()));
  
  // Show available metrics files for debugging
  console.log('\n📋 Available metrics files by LLM:');
  for (const [llmName, data] of llmDataMap) {
    const hasMetrics = data.metrics ? '✅' : '❌';
    const hasResults = data.results ? '✅' : '❌';
    console.log(`   ${llmName}: Results ${hasResults} | Metrics ${hasMetrics}`);
    
    if (data.metrics && data.metrics.testFiles) {
      const fileCount = Object.keys(data.metrics.testFiles).length;
      console.log(`      📁 ${fileCount} test files with metrics`);
    }
  }
    // Merge data for each LLM
  const mergedDataArray = [];
  for (const [llmName, data] of llmDataMap) {
    if (data.results || data.metrics) {
      const mergedLLMData = await mergeDataForLLM(llmName, data.results, data.metrics);
      if (mergedLLMData) { // Only add non-null results
        mergedDataArray.push(mergedLLMData);
      }
    }
  }
  
  return mergedDataArray;
}

async function uploadToMongoDB(mergedData) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Clear existing data
    await collection.deleteMany({});
    
    // Insert merged data
    const result = await collection.insertMany(mergedData);
    
    console.log(`✅ Successfully uploaded ${result.insertedCount} records to MongoDB`);
    
  } catch (error) {
    console.error('❌ Error uploading to MongoDB:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function main() {
  try {
    console.log('🚀 Starting merge and ingest process...');
    
    const mergedData = await loadAndMergeData();
    
    if (mergedData.length === 0) {
      console.log('⚠️ No data to upload');
      return;
    }
      await uploadToMongoDB(mergedData);
    
    // Show simple match summary table
    console.log('\n📊 MATCH SUMMARY');
    console.log('─'.repeat(50));
    console.log('LLM'.padEnd(25) + 'Matches/Total'.padEnd(15) + 'Percentage');
    console.log('─'.repeat(50));
    
    mergedData.forEach(llmData => {
      if (llmData.results && llmData.results.tests) {
        const totalTests = llmData.results.tests.length;
        const matchedTests = llmData.results.tests.filter(test => 
          test.metricsFound === true
        ).length;
        const percentage = totalTests > 0 ? ((matchedTests / totalTests) * 100).toFixed(1) : '0.0';
        
        const llmName = llmData.llm.padEnd(25);
        const matchInfo = `${matchedTests}/${totalTests}`.padEnd(15);
        
        console.log(`${llmName}${matchInfo}${percentage}%`);
      }
    });
    
    console.log('─'.repeat(50));
    
    console.log('\n✅ Merge and ingest process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in merge and ingest process:', error);
    process.exit(1);
  }
}

// Run main function if this script is executed directly
const currentFileUrl = import.meta.url;
const execFileUrl = `file:///${process.argv[1].replace(/\\/g, '/')}`;

if (currentFileUrl === execFileUrl) {
  main().catch(console.error);
} else {
  main().catch(console.error);
}

export {
  mergeDataForLLM,
  loadAndMergeData,
  uploadToMongoDB,
  findTestMetrics
};
