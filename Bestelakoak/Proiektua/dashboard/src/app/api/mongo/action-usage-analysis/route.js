import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'llm_testing_dashboard';

// Collection names
const COLLECTIONS = {
  MERGED_TEST_DATA: 'merged_test_data',
  TEST_EXECUTION_RESULTS: 'test_execution_results',
  TEST_EFFICIENCY_METRICS: 'test_efficiency_metrics'
};

let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(DB_NAME);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const llm = searchParams.get('llm');
    const latest = searchParams.get('latest') === 'true';

    const database = await connectToDatabase();
    const collection = database.collection(COLLECTIONS.MERGED_TEST_DATA);

    let result;

    switch (type) {      case 'summary':
        // Generate summary from the new simplified collections
        console.log('📊 Generating summary from simplified collections...');
        const resultsCollection = database.collection(COLLECTIONS.TEST_EXECUTION_RESULTS);
        const metricsCollection = database.collection(COLLECTIONS.TEST_EFFICIENCY_METRICS);
        
        const testResults = await resultsCollection.find({}).toArray();
        const testMetrics = await metricsCollection.find({}).toArray();
        
        console.log(`📊 Found ${testResults.length} test result records and ${testMetrics.length} metric records`);
        
        if (testResults.length === 0 && testMetrics.length === 0) {
          console.log('⚠️ No data found for summary generation');
          result = {
            error: 'No data available',
            message: 'No test data found in database. Please run the ingest-test-data script first.'
          };
        } else {
          result = generateSummaryFromTestData(testResults, testMetrics);
          console.log('📊 Summary generated:', result ? 'Success' : 'Failed');
          if (!result) {
            result = {
              error: 'Summary generation failed',
              message: 'Failed to generate summary from available test data'
            };
          }
        }
        break;      case 'analysis':
        // Get detailed analysis from the new simplified collections
        const analysisResultsCollection = database.collection(COLLECTIONS.TEST_EXECUTION_RESULTS);
        const analysisMetricsCollection = database.collection(COLLECTIONS.TEST_EFFICIENCY_METRICS);
        
        if (llm) {
          // Get specific LLM analysis
          console.log(`📊 Getting detailed analysis for LLM: ${llm}`);
          const resultRecord = await analysisResultsCollection.findOne({ llm });
          const metricRecord = await analysisMetricsCollection.findOne({ llm });
          
          if (resultRecord || metricRecord) {
            result = generateDetailedAnalysisFromTestData(resultRecord, metricRecord, llm);
          } else {
            console.log(`❌ No data found for LLM: ${llm}`);
          }
        } else {
          // Get all analyses
          console.log('📊 Getting analysis for all LLMs');
          const allResultRecords = await analysisResultsCollection.find({}).toArray();
          const allMetricRecords = await analysisMetricsCollection.find({}).toArray();
          
          // Generate analysis for each LLM
          const llmMap = new Map();
          
          // Collect all LLM names
          allResultRecords.forEach(record => llmMap.set(record.llm, { results: record }));
          allMetricRecords.forEach(record => {
            if (llmMap.has(record.llm)) {
              llmMap.get(record.llm).metrics = record;
            } else {
              llmMap.set(record.llm, { metrics: record });
            }
          });
          
          result = Array.from(llmMap.entries()).map(([llmName, data]) => 
            generateDetailedAnalysisFromTestData(data.results, data.metrics, llmName)
          ).filter(analysis => analysis !== null);
        }
        break;case 'comparison':
        // Generate comparisons between LLMs
        const comparisonData = await collection.find({}).toArray();
        if (llm) {
          result = generateComparisonsForLLM(comparisonData, llm);
        } else {
          result = generateAllComparisons(comparisonData);
        }
        break;      case 'test-details':
        // Get detailed test comparison data from new collections
        const testDetailsResultsCollection = database.collection(COLLECTIONS.TEST_EXECUTION_RESULTS);
        const testDetailsMetricsCollection = database.collection(COLLECTIONS.TEST_EFFICIENCY_METRICS);
        
        if (llm) {
          console.log(`📊 Getting test details for LLM: ${llm}`);
          const targetResults = await testDetailsResultsCollection.findOne({ llm });
          const targetMetrics = await testDetailsMetricsCollection.findOne({ llm });
          const baselineResults = await testDetailsResultsCollection.findOne({ llm: 'original' });
          const baselineMetrics = await testDetailsMetricsCollection.findOne({ llm: 'original' });
            if ((targetResults || targetMetrics) && (baselineResults || baselineMetrics)) {
            result = generateTestDetailsFromTestData(targetResults, targetMetrics, baselineResults, baselineMetrics, llm);
            console.log(`📋 Generated test details result for ${llm}:`, result ? `${result.testComparison?.tests?.length || 0} test comparisons` : 'null');
          } else {
            console.log(`❌ Insufficient data for test details comparison: ${llm}`);
            console.log(`   Target results: ${!!targetResults}, Target metrics: ${!!targetMetrics}`);
            console.log(`   Baseline results: ${!!baselineResults}, Baseline metrics: ${!!baselineMetrics}`);
          }
        } else {
          console.log('📊 Getting test details for all LLMs');
          const allResults = await testDetailsResultsCollection.find({}).toArray();
          const allMetrics = await testDetailsMetricsCollection.find({}).toArray();
          const baselineResults = allResults.find(r => r.llm === 'original');
          const baselineMetrics = allMetrics.find(m => m.llm === 'original');
          
          if (baselineResults || baselineMetrics) {
            result = allResults
              .filter(r => r.llm !== 'original')
              .map(targetResults => {
                const targetMetrics = allMetrics.find(m => m.llm === targetResults.llm);
                return generateTestDetailsFromTestData(targetResults, targetMetrics, baselineResults, baselineMetrics, targetResults.llm);
              })
              .filter(details => details !== null);
          } else {
            console.log('❌ No baseline data found for test details comparison');
          }
        }
        break;case 'stats':
        // Get collection statistics from all collections
        const mergedCount = await collection.countDocuments();
        const resultsCount = await database.collection(COLLECTIONS.TEST_EXECUTION_RESULTS).countDocuments();
        const metricsCount = await database.collection(COLLECTIONS.TEST_EFFICIENCY_METRICS).countDocuments();
        
        const latestMerged = await collection.findOne({}, { sort: { timestamp: -1 } });
        const latestResults = await database.collection(COLLECTIONS.TEST_EXECUTION_RESULTS).findOne({}, { sort: { timestamp: -1 } });
        const latestMetrics = await database.collection(COLLECTIONS.TEST_EFFICIENCY_METRICS).findOne({}, { sort: { timestamp: -1 } });
        
        result = {
          [COLLECTIONS.MERGED_TEST_DATA]: {
            count: mergedCount,
            latestDate: latestMerged?.timestamp || null
          },
          [COLLECTIONS.TEST_EXECUTION_RESULTS]: {
            count: resultsCount,
            latestDate: latestResults?.timestamp || null
          },
          [COLLECTIONS.TEST_EFFICIENCY_METRICS]: {
            count: metricsCount,
            latestDate: latestMetrics?.timestamp || null
          }
        };
        break;case 'llm-list':
        // Get list of available LLMs from both collections
        const resultsLLMs = await database.collection(COLLECTIONS.TEST_EXECUTION_RESULTS).distinct('llm');
        const metricsLLMs = await database.collection(COLLECTIONS.TEST_EFFICIENCY_METRICS).distinct('llm');
        
        // Combine and deduplicate LLM lists
        const allLLMs = [...new Set([...resultsLLMs, ...metricsLLMs])];
        
        result = allLLMs.map(llm => ({
          key: llm,
          displayName: getLLMDisplayName(llm)
        }));
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: summary, analysis, comparison, stats, or llm-list' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'No data found for the specified parameters' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Action Usage Analysis API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    await connectToDatabase();

    switch (action) {
      case 'trigger-analysis':
        // This would typically trigger the analysis script
        // For now, just return success
        return NextResponse.json({
          message: 'Analysis trigger received. Run the action-usage-analysis script to process data.',
          command: 'node scripts/action-usage-analysis.js --process-all'
        });

      case 'regenerate-summary':
        // This would typically trigger summary regeneration
        return NextResponse.json({
          message: 'Summary regeneration trigger received. Run the analysis script to regenerate.',
          command: 'node scripts/action-usage-analysis.js --analysis'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: trigger-analysis or regenerate-summary' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Action Usage Analysis POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get display names for LLMs
function getLLMDisplayName(llmKey) {
  const mapping = {
    'original': 'Original (Baseline)',
    'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
    'claude_3_7_sonnet': 'Claude 3.7 Sonnet', 
    'claude_3_7_sonnet_thinking': 'Claude 3.7 Sonnet Thinking',
    'claude_sonnet_4': 'Claude Sonnet 4',
    'gemini_2_0_flash': 'Gemini 2.0 Flash',
    'gemini_2_5_pro_preview': 'Gemini 2.5 Pro (Preview)',
    'gpt_4_1': 'GPT-4.1',
    'gpt_4o': 'GPT-4o',
    'o1_preview': 'o1 (Preview)',
    'o3_mini': 'o3-mini',
    'o4_mini_preview': 'o4-mini (Preview)'
  };
  
  return mapping[llmKey] || llmKey;
}

// Transform merged test data to ActionAnalysis format
function transformToAnalysisFormat(mergedData) {
  const { llm, timestamp, summary, tests, testFiles, actionableCommandTypes } = mergedData;
  
  // Calculate action distribution by type
  const actionDistribution = {};
  const actionTypeCounts = {};
  
  // Count actions by type from all tests
  tests.forEach(test => {
    if (test.efficiency && test.efficiency.commands) {
      test.efficiency.commands.forEach(command => {
        actionTypeCounts[command] = (actionTypeCounts[command] || 0) + 1;
      });
    }
  });

  // Convert to distribution format
  const totalActions = Object.values(actionTypeCounts).reduce((sum, count) => sum + count, 0);
  Object.keys(actionTypeCounts).forEach(actionType => {
    actionDistribution[actionType] = {
      count: actionTypeCounts[actionType],
      percentage: totalActions > 0 ? (actionTypeCounts[actionType] / totalActions * 100) : 0
    };
  });

  // Calculate test complexity distribution
  const testComplexity = { simple: 0, medium: 0, complex: 0 };
  tests.forEach(test => {
    if (test.efficiency && test.efficiency.actionableCommands !== undefined) {
      const commandCount = test.efficiency.actionableCommands;
      if (commandCount <= 5) testComplexity.simple++;
      else if (commandCount <= 15) testComplexity.medium++;
      else testComplexity.complex++;
    }
  });

  // Build byTest array
  const byTest = [];
  Object.keys(testFiles).forEach(fileName => {
    const fileData = testFiles[fileName];
    if (fileData.tests) {
      Object.keys(fileData.tests).forEach(testName => {
        const testData = fileData.tests[testName];
        byTest.push({
          filePath: fileName,
          orderInFile: testData.orderInFile || 1,
          actionableCommands: testData.actionableCommands || 0,
          commands: testData.commands || []
        });
      });
    }
  });

  // Most and least used actions
  const sortedActions = Object.entries(actionTypeCounts).sort((a, b) => b[1] - a[1]);
  const mostUsedActions = sortedActions.slice(0, 5);
  const leastUsedActions = sortedActions.slice(-5).reverse();  // Calculate execution stats - use RAW execution summary for display counts
  const rawExecutionSummary = mergedData.summary?.execution || {};
  const totalExecutedTests = rawExecutionSummary.tests || 0;
  const passedTests = rawExecutionSummary.passed || 0;
  const failedTests = rawExecutionSummary.failed || 0;
  const passRate = totalExecutedTests > 0 ? (passedTests / totalExecutedTests * 100) : 0;
  
  // Calculate average duration from matched tests (for accuracy)
  const testsWithExecution = tests.filter(test => test.execution);
  const testDurations = testsWithExecution
    .map(test => test.execution.duration || 0)
    .filter(duration => duration > 0);
  const avgDuration = testDurations.length > 0 
    ? testDurations.reduce((sum, duration) => sum + duration, 0) / testDurations.length 
    : 0;
  
  // Count tests with execution data for matched tests
  const totalMatchedTests = testsWithExecution.length;

  return {
    _id: `analysis_${llm}`,
    llm,
    displayName: getLLMDisplayName(llm),
    timestamp,
    actions: {
      total: summary.efficiency.totalActionableCommands || 0,
      byType: actionTypeCounts,
      byTest,
      patterns: {
        mostUsedActions,
        leastUsedActions,
        actionDistribution,        testComplexity
      }    },
    efficiency: {
      totalTests: tests.length, // Use our matched tests count
      totalCommands: summary.efficiency.totalActionableCommands || 0,
      commandsPerTest: tests.length > 0 ? (summary.efficiency.totalActionableCommands || 0) / tests.length : 0,
      avgExecutionTime: avgDuration
    },
    execution: {
      totalTests: totalExecutedTests, // Use RAW execution summary for display
      passed: passedTests, // Use RAW execution summary for display
      failed: failedTests, // Use RAW execution summary for display
      passRate: passRate, // Use RAW execution summary for display
      avgDuration: avgDuration // Use calculated average from matched tests
    }
  };
}

// Generate test details comparison from simplified test data collections
function generateTestDetailsFromTestData(targetResults, targetMetrics, baselineResults, baselineMetrics, llmName) {
  console.log(`🔍 generateTestDetailsFromTestData for LLM: ${llmName}`);
  console.log(`📊 Target results:`, targetResults ? `${targetResults.results?.tests?.length || 0} tests` : 'none');
  console.log(`📊 Target metrics:`, targetMetrics ? `${Object.keys(targetMetrics.testFiles || {}).length} files` : 'none');
  console.log(`📊 Baseline results:`, baselineResults ? `${baselineResults.results?.tests?.length || 0} tests` : 'none');
  console.log(`📊 Baseline metrics:`, baselineMetrics ? `${Object.keys(baselineMetrics.testFiles || {}).length} files` : 'none');
  
  // Log first few test names from each source
  if (targetResults?.results?.tests?.length > 0) {
    console.log(`📊 Sample target test names:`, targetResults.results.tests.slice(0, 3).map(t => t.name));
  }
  if (baselineResults?.results?.tests?.length > 0) {
    console.log(`📊 Sample baseline test names:`, baselineResults.results.tests.slice(0, 3).map(t => t.name));
  }
  
  if (!targetResults && !targetMetrics) {
    console.log(`❌ No target data found for LLM: ${llmName}`);
    return null;
  }

  if (!baselineResults && !baselineMetrics) {
    console.log(`❌ No baseline data found for comparison`);
    return null;
  }

  try {
    const testDetails = {
      target: llmName,
      targetDisplayName: getLLMDisplayName(llmName),
      baseline: baselineResults?.llm || baselineMetrics?.llm || 'original',
      baselineDisplayName: getLLMDisplayName(baselineResults?.llm || baselineMetrics?.llm || 'original'),
      timestamp: new Date().toISOString()
    };

    // Create test comparison data by correlating individual tests
    const testComparison = {
      summary: {
        totalBaselineTests: baselineResults?.results?.summary?.tests || 0,
        totalTargetTests: targetResults?.results?.summary?.tests || 0,
        baselinePassedTests: baselineResults?.results?.summary?.passed || 0,
        targetPassedTests: targetResults?.results?.summary?.passed || 0,
        baselinePassRate: baselineResults?.results?.summary?.tests > 0 ? 
          (baselineResults.results.summary.passed / baselineResults.results.summary.tests) * 100 : 0,
        targetPassRate: targetResults?.results?.summary?.tests > 0 ? 
          (targetResults.results.summary.passed / targetResults.results.summary.tests) * 100 : 0,
        executionRate: 0,
        matchingPassed: 0,
        matchingFailed: 0
      },
      tests: []
    };

    // Calculate execution rate
    if (testComparison.summary.totalBaselineTests > 0) {
      testComparison.summary.executionRate = 
        (testComparison.summary.totalTargetTests / testComparison.summary.totalBaselineTests) * 100;
    }

    // Process individual tests for detailed comparison
    const baselineTests = baselineResults?.results?.tests || [];
    const targetTests = targetResults?.results?.tests || [];
    
    // Create a map of target tests by filename and test name for quick lookup
    const targetTestMap = new Map();
    targetTests.forEach(test => {
      // Skip tests without proper name
      const testName = test.name;
      if (!testName) {
        return;
      }
      const filename = test.filePath ? test.filePath.replace(/\\/g, '/').split('/').pop() : '';
      const key = `${filename}-${testName}`;
      targetTestMap.set(key, test);
      
      // Also add an entry with the base test name for dynamic executions
      const baseTestName = testName
        .replace(/\s*\(\d+\)$/, '')           // Remove (1), (2), etc.
        .replace(/\s*-\s*run\s*\d+$/i, '')    // Remove "- run 1", "- run 2", etc.
        .replace(/\s*#\d+$/, '')              // Remove "#1", "#2", etc.
        .trim();
        
      if (baseTestName !== testName) {
        const baseKey = `${filename}-${baseTestName}`;
        if (!targetTestMap.has(baseKey)) {
          targetTestMap.set(baseKey, test);
        }
      }
    });
    
    // Get metrics for test-level command comparison (new simplified structure)
    const baselineTestFiles = baselineMetrics?.testFiles || {};
    const targetTestFiles = targetMetrics?.testFiles || {};
    
    console.log(`📁 Available baseline test files:`, Object.keys(baselineTestFiles).slice(0, 5));
    console.log(`📁 Available target test files:`, Object.keys(targetTestFiles).slice(0, 5));

    // Helper function to find test metrics in new simplified structure
    function findTestMetrics(testFiles, filename, testName) {
      const fileMetrics = testFiles[filename];
      if (!fileMetrics) return null;
      
      // In new structure, each file has direct test_name, actionableCommands, and commands
      if (fileMetrics.test_name === testName || 
          fileMetrics.test_name.includes(testName) || 
          testName.includes(fileMetrics.test_name)) {
        return {
          actionableCommands: fileMetrics.actionableCommands || 0,
          commands: fileMetrics.commands || {}
        };
      }
      
      return null;
    }

    // Process each baseline test and find corresponding target test
    console.log(`🔄 Processing ${baselineTests.length} baseline tests for correlation...`);
    baselineTests.forEach((baselineTest, index) => {
      // Skip tests without proper name
      if (!baselineTest.name) {
        console.log(`⚠️ Skipping test without name at index ${index}`);
        return;
      }
      
      const baselineFilename = baselineTest.filePath ? baselineTest.filePath.replace(/\\/g, '/').split('/').pop() : '';
      const baselineTestName = baselineTest.name;
      const key = `${baselineFilename}-${baselineTestName}`;
      let targetTest = targetTestMap.get(key);
      
      // If not found, try with base test name for dynamic executions
      if (!targetTest) {
        const baseTestName = baselineTestName
          .replace(/\s*\(\d+\)$/, '')           // Remove (1), (2), etc.
          .replace(/\s*-\s*run\s*\d+$/i, '')    // Remove "- run 1", "- run 2", etc.
          .replace(/\s*#\d+$/, '')              // Remove "#1", "#2", etc.
          .trim();
          
        if (baseTestName !== baselineTestName) {
          const baseKey = `${baselineFilename}-${baseTestName}`;
          targetTest = targetTestMap.get(baseKey);
        }
      }
      
      if (index < 3) { // Log first 3 for debugging
        console.log(`🔍 Test ${index + 1}: ${key} -> ${targetTest ? 'Found' : 'Not found'}`);
      }
      
      // Get command data from metrics (new simplified structure)
      const baseTestName = baselineTestName
        .replace(/\s*\(\d+\)$/, '')           // Remove (1), (2), etc.
        .replace(/\s*-\s*run\s*\d+$/i, '')    // Remove "- run 1", "- run 2", etc.
        .replace(/\s*#\d+$/, '')              // Remove "#1", "#2", etc.
        .trim();
        
      const baselineTestMetrics = findTestMetrics(baselineTestFiles, baselineFilename, baseTestName) || 
                                  findTestMetrics(baselineTestFiles, baselineFilename, baselineTestName);
      const targetTestMetrics = findTestMetrics(targetTestFiles, baselineFilename, baseTestName) || 
                               findTestMetrics(targetTestFiles, baselineFilename, baselineTestName);
      
      if (index < 3) { // Log first 3 for debugging
        const isDynamicExecution = baseTestName !== baselineTestName;
        console.log(`📋 Metrics lookup for ${baselineFilename}:`);
        console.log(`   Test name: "${baselineTestName}"`);
        console.log(`   Base test name: "${baseTestName}"`);
        console.log(`   Is dynamic execution: ${isDynamicExecution}`);
        console.log(`   Baseline test metrics:`, baselineTestMetrics ? `${baselineTestMetrics.actionableCommands} actions` : 'none');
        console.log(`   Target test metrics:`, targetTestMetrics ? `${targetTestMetrics.actionableCommands} actions` : 'none');
      }

      const testDetail = {
        id: `${llmName}-${baselineFilename}-${baselineTestName || 'unnamed'}-${index}`,
        filename: baselineFilename || 'unknown',
        testName: baselineTestName || 'unnamed',
        baseline: {
          status: baselineTest.status || 'unknown',
          passed: baselineTest.status === 'passed',
          duration: baselineTest.duration || 0,
          actionableCommands: baselineTestMetrics?.actionableCommands || 0,
          commands: baselineTestMetrics?.commands || {}
        },
        target: {
          executed: !!targetTest,
          status: targetTest?.status || 'not executed',
          passed: targetTest?.status === 'passed' || false,
          duration: targetTest?.duration || 0,
          actionableCommands: targetTestMetrics?.actionableCommands || 0,
          commands: targetTestMetrics?.commands || {}
        },
        comparison: {
          statusMatch: false,
          actionsDifference: 0,
          durationDifference: 0
        }
      };

      // Calculate comparisons
      if (targetTest) {
        testDetail.comparison.statusMatch = baselineTest.status === targetTest.status;
        testDetail.comparison.actionsDifference = 
          testDetail.target.actionableCommands - testDetail.baseline.actionableCommands;
        testDetail.comparison.durationDifference = 
          testDetail.target.duration - testDetail.baseline.duration;
        
        // Update summary stats
        if (baselineTest.status === 'passed' && (targetTest?.status === 'passed')) {
          testComparison.summary.matchingPassed++;
        } else if (baselineTest.status !== 'passed' && (targetTest?.status !== 'passed')) {
          testComparison.summary.matchingFailed++;
        }
      }

      testComparison.tests.push(testDetail);
    });
    
    testDetails.testComparison = testComparison;

    console.log(`✅ Generated test details for ${llmName}:`, {
      totalTests: testComparison.summary.totalTargetTests,
      executionRate: testComparison.summary.executionRate.toFixed(1) + '%',
      comparisons: testComparison.tests.length,
      testsWithActions: testComparison.tests.filter(t => t.baseline.actionableCommands > 0 || t.target.actionableCommands > 0).length,
      dynamicExecutions: testComparison.tests.filter(t => t.testName.match(/\(\d+\)|#\d+|- run \d+/i)).length,
      avgBaselineActions: (testComparison.tests.reduce((sum, t) => sum + t.baseline.actionableCommands, 0) / testComparison.tests.length).toFixed(1),
      avgTargetActions: (testComparison.tests.reduce((sum, t) => sum + t.target.actionableCommands, 0) / testComparison.tests.length).toFixed(1),
      sampleIds: testComparison.tests.slice(0, 3).map(t => t.id)
    });
    
    console.log(`📝 Final testDetails structure:`, {
      target: testDetails.target,
      baseline: testDetails.baseline,
      hasTestComparison: !!testDetails.testComparison,
      hasTests: !!testDetails.testComparison?.tests,
      testCount: testDetails.testComparison?.tests?.length || 0
    });

    return testDetails;

  } catch (error) {
    console.error(`❌ Error generating test details for ${llmName}:`, error);
    return null;
  }
}

// Generate detailed analysis from simplified test data collections
function generateDetailedAnalysisFromTestData(resultRecord, metricRecord, llmName) {
  console.log(`🔍 generateDetailedAnalysisFromTestData for LLM: ${llmName}`);
  
  if (!resultRecord && !metricRecord) {
    console.log(`❌ No data found for LLM: ${llmName}`);
    return null;
  }

  try {
    const analysis = {
      llm: llmName,
      displayName: getLLMDisplayName(llmName),
      timestamp: new Date().toISOString()
    };

    // Extract execution data from results (new simplified structure)
    if (resultRecord && resultRecord.results && resultRecord.results.summary) {
      const summary = resultRecord.results.summary;
      const totalDuration = (summary.stop || 0) - (summary.start || 0);
      
      analysis.execution = {
        totalTests: summary.tests || 0,
        passed: summary.passed || 0,
        failed: summary.failed || 0,
        skipped: summary.skipped || 0,
        passRate: summary.tests > 0 ? (summary.passed / summary.tests) * 100 : 0,
        avgDuration: summary.tests > 0 ? totalDuration / summary.tests : 0,
        totalDuration: totalDuration
      };
    } else {
      analysis.execution = {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        passRate: 0,
        avgDuration: 0,
        totalDuration: 0
      };
    }

    // Extract efficiency data from metrics (new simplified structure)
    if (metricRecord && metricRecord.testFiles) {
      const testFiles = metricRecord.testFiles;
      let totalCommands = 0;
      let totalTests = 0;
      const allCommands = {};
      
      // Calculate totals from testFiles structure
      Object.values(testFiles).forEach(fileData => {
        totalCommands += fileData.actionableCommands || 0;
        totalTests += 1; // Each file has one test
        
        // Aggregate command usage
        if (fileData.commands && typeof fileData.commands === 'object') {
          Object.entries(fileData.commands).forEach(([command, count]) => {
            allCommands[command] = (allCommands[command] || 0) + count;
          });
        }
      });
      
      analysis.efficiency = {
        totalCommands: totalCommands,
        commandsPerTest: totalTests > 0 ? totalCommands / totalTests : 0,
        totalTests: totalTests
      };
      
      // Generate action patterns from command usage
      const mostUsedCommands = Object.entries(allCommands)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([command, count]) => [command, count]);
      
      const leastUsedCommands = Object.entries(allCommands)
        .sort(([,a], [,b]) => a - b)
        .slice(0, 10)
        .map(([command, count]) => [command, count]);
      
      // Calculate test complexity distribution
      const complexity = { simple: 0, medium: 0, complex: 0 };
      Object.values(testFiles).forEach(fileData => {
        const commands = fileData.actionableCommands || 0;
        if (commands <= 5) complexity.simple++;
        else if (commands <= 15) complexity.medium++;
        else complexity.complex++;
      });
      
      // Generate action distribution
      const totalCommandCount = Object.values(allCommands).reduce((sum, count) => sum + count, 0);
      const actionDistribution = {};
      Object.entries(allCommands).forEach(([command, count]) => {
        actionDistribution[command] = {
          count: count,
          percentage: totalCommandCount > 0 ? (count / totalCommandCount) * 100 : 0
        };
      });
      
      analysis.actions = {
        total: totalCommands,
        patterns: {
          actionDistribution: actionDistribution,
          testComplexity: complexity,
          mostUsedActions: mostUsedCommands,
          leastUsedActions: leastUsedCommands
        }
      };
      
    } else {
      analysis.efficiency = {
        totalCommands: 0,
        commandsPerTest: 0,
        totalTests: 0
      };
      analysis.actions = {
        total: 0,
        patterns: {
          actionDistribution: {},
          testComplexity: { simple: 0, medium: 0, complex: 0 },
          mostUsedActions: [],
          leastUsedActions: []
        }
      };
    }

    console.log(`✅ Generated detailed analysis for ${llmName}:`, {
      totalTests: analysis.execution.totalTests,
      passRate: analysis.execution.passRate,
      commandsPerTest: analysis.efficiency.commandsPerTest
    });

    return analysis;

  } catch (error) {
    console.error(`❌ Error generating detailed analysis for ${llmName}:`, error);
    return null;
  }
}

// Generate summary from simplified test data collections
function generateSummaryFromTestData(testResults, testMetrics) {
  console.log('🔍 generateSummaryFromTestData called with', testResults.length, 'result records and', testMetrics.length, 'metric records');
  
  if (!testResults && !testMetrics) {
    console.log('❌ No data provided to generateSummaryFromTestData');
    return null;
  }

  try {
    // Process test results and metrics to create LLM analyses
    const llmAnalyses = [];
    const llmSet = new Set();
    
    // Collect all LLM names
    testResults.forEach(record => llmSet.add(record.llm));
    testMetrics.forEach(record => llmSet.add(record.llm));
    
    console.log('🎯 Processing LLMs:', Array.from(llmSet));
    
    // Process each LLM
    Array.from(llmSet).forEach(llmName => {
      const resultRecord = testResults.find(r => r.llm === llmName);
      const metricRecord = testMetrics.find(m => m.llm === llmName);
      
      if (resultRecord || metricRecord) {
        const analysis = {
          llm: llmName,
          displayName: getLLMDisplayName(llmName)
        };
        
        // Extract data from test results (new simplified structure)
        if (resultRecord) {
          // Get data from the original file structure
          if (resultRecord.results && resultRecord.results.summary) {
            analysis.totalTests = resultRecord.results.summary.tests || 0;
            analysis.passed = resultRecord.results.summary.passed || 0;
            analysis.failed = resultRecord.results.summary.failed || 0;
            analysis.passRate = analysis.totalTests > 0 ? (analysis.passed / analysis.totalTests) * 100 : 0;
            analysis.executionDuration = (resultRecord.results.summary.stop || 0) - (resultRecord.results.summary.start || 0);
            analysis.avgDuration = analysis.totalTests > 0 ? analysis.executionDuration / analysis.totalTests : 0;
          } else {
            analysis.totalTests = 0;
            analysis.passed = 0;
            analysis.failed = 0;
            analysis.passRate = 0;
            analysis.executionDuration = 0;
            analysis.avgDuration = 0;
          }
        } else {
          analysis.totalTests = 0;
          analysis.passed = 0;
          analysis.failed = 0;
          analysis.passRate = 0;
          analysis.executionDuration = 0;
          analysis.avgDuration = 0;
        }
        
        // Extract data from efficiency metrics (new simplified structure)
        if (metricRecord && metricRecord.testFiles) {
          // Calculate totals from the new testFiles structure
          const testFiles = metricRecord.testFiles;
          let totalActionableCommands = 0;
          let totalTestCases = 0;
          
          Object.values(testFiles).forEach(fileData => {
            totalActionableCommands += fileData.actionableCommands || 0;
            totalTestCases += 1; // Each file has one test in new structure
          });
          
          analysis.totalActionableCommands = totalActionableCommands;
          analysis.commandsPerTest = totalTestCases > 0 ? totalActionableCommands / totalTestCases : 0;
          analysis.totalTestFiles = Object.keys(testFiles).length;
          analysis.totalTestCases = totalTestCases;
        } else {
          analysis.totalActionableCommands = 0;
          analysis.commandsPerTest = 0;
          analysis.totalTestFiles = 0;
          analysis.totalTestCases = 0;
        }
        
        llmAnalyses.push(analysis);
      }
    });
    
    if (llmAnalyses.length === 0) {
      console.log('❌ No LLM analyses could be generated');
      return null;
    }
    
    // Find baseline (original) or use first LLM
    const baseline = llmAnalyses.find(analysis => analysis.llm === 'original') || llmAnalyses[0];
    console.log('📍 Baseline LLM:', baseline.llm);
    
    // Calculate best performing LLMs
    let mostEfficientLLM = llmAnalyses[0];
    let highestPassRateLLM = llmAnalyses[0];
    let fastestLLM = llmAnalyses[0];
    
    llmAnalyses.forEach(analysis => {
      // Most efficient = lowest commands per test (but > 0)
      if (analysis.commandsPerTest > 0 && 
          (mostEfficientLLM.commandsPerTest === 0 || analysis.commandsPerTest < mostEfficientLLM.commandsPerTest)) {
        mostEfficientLLM = analysis;
      }
      
      // Highest pass rate
      if (analysis.passRate > highestPassRateLLM.passRate) {
        highestPassRateLLM = analysis;
      }
      
      // Fastest execution
      if (analysis.avgDuration > 0 && 
          (fastestLLM.avgDuration === 0 || analysis.avgDuration < fastestLLM.avgDuration)) {
        fastestLLM = analysis;
      }
    });
    
    // Calculate overall metrics
    const totalTests = llmAnalyses.reduce((sum, analysis) => sum + analysis.totalTests, 0);
    const totalCommands = llmAnalyses.reduce((sum, analysis) => sum + analysis.totalActionableCommands, 0);
    const totalPassed = llmAnalyses.reduce((sum, analysis) => sum + analysis.passed, 0);
    const totalDuration = llmAnalyses.reduce((sum, analysis) => sum + analysis.executionDuration, 0);
    
    return {
      _id: 'latest_action_usage_summary',
      timestamp: new Date().toISOString(),
      totalLLMs: llmAnalyses.length,
      baseline: baseline.llm,
      summary: {
        mostEfficientLLM: {
          llm: mostEfficientLLM.llm,
          displayName: mostEfficientLLM.displayName,
          commandsPerTest: mostEfficientLLM.commandsPerTest
        },
        highestPassRateLLM: {
          llm: highestPassRateLLM.llm,
          displayName: highestPassRateLLM.displayName,
          passRate: highestPassRateLLM.passRate
        },
        fastestLLM: {
          llm: fastestLLM.llm,
          displayName: fastestLLM.displayName,
          avgDuration: fastestLLM.avgDuration
        },
        overallMetrics: {
          avgCommandsPerTest: totalTests > 0 ? totalCommands / totalTests : 0,
          avgPassRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
          avgExecutionTime: totalTests > 0 ? totalDuration / totalTests : 0
        }
      },
      llmAnalyses: llmAnalyses.map(analysis => ({
        llm: analysis.llm,
        displayName: analysis.displayName,
        commandsPerTest: analysis.commandsPerTest,
        passRate: analysis.passRate,
        avgDuration: analysis.avgDuration,
        totalActions: analysis.totalActionableCommands,
        totalTests: analysis.totalTests,
        passed: analysis.passed,
        failed: analysis.failed
      }))
    };
    
  } catch (error) {
    console.error('❌ Error in generateSummaryFromTestData:', error);
    return null;
  }
}

// Generate summary from all merged data
function generateSummaryFromMergedData(allData) {
  console.log('🔍 generateSummaryFromMergedData called with', allData.length, 'records');
  
  if (!allData || allData.length === 0) {
    console.log('❌ No data provided to generateSummaryFromMergedData');
    return null;
  }

  try {
    // Transform all data first to get consistent metrics
    console.log('🔄 Transforming data...');
    const transformedData = allData.map(data => transformToAnalysisFormat(data));
    console.log('✅ Data transformed successfully');
    
    const baseline = transformedData.find(data => data.llm === 'original') || transformedData[0];
    console.log('📍 Baseline found:', baseline ? baseline.llm : 'None');
  
  // Find most efficient LLM (lowest commands per test)
  let mostEfficientLLM = transformedData[0];
  let leastEfficientLLM = transformedData[0];
  let highestPassRateLLM = transformedData[0];
  let fastestLLM = transformedData[0];

  transformedData.forEach(data => {
    const commandsPerTest = data.efficiency.commandsPerTest || 0;
    const passRate = data.execution.passRate || 0;
    const avgDuration = data.execution.avgDuration || 0;

    if (commandsPerTest > 0 && (mostEfficientLLM.efficiency.commandsPerTest || Infinity) > commandsPerTest) {
      mostEfficientLLM = data;
    }
    if (commandsPerTest > (leastEfficientLLM.efficiency.commandsPerTest || 0)) {
      leastEfficientLLM = data;
    }
    if (passRate > (highestPassRateLLM.execution.passRate || 0)) {
      highestPassRateLLM = data;
    }
    if (avgDuration > 0 && avgDuration < (fastestLLM.execution.avgDuration || Infinity)) {
      fastestLLM = data;
    }
  });

  // Calculate overall action type distribution
  const overallActionTypes = {};
  allData.forEach(data => {
    if (data.actionableCommandTypes) {
      data.actionableCommandTypes.forEach(actionType => {
        overallActionTypes[actionType] = (overallActionTypes[actionType] || 0) + 1;
      });
    }
  });

  // Calculate overall metrics using transformed data
  const totalTests = transformedData.reduce((sum, data) => sum + (data.execution.totalTests || 0), 0);
  const totalCommands = transformedData.reduce((sum, data) => sum + (data.efficiency.totalCommands || 0), 0);
  const totalDuration = transformedData.reduce((sum, data) => {
    return sum + ((data.execution.avgDuration || 0) * (data.execution.totalTests || 0));
  }, 0);
  const totalPassed = transformedData.reduce((sum, data) => sum + (data.execution.passed || 0), 0);
  
  const llmAnalyses = transformedData.map(data => ({
    llm: data.llm,
    displayName: data.displayName,
    commandsPerTest: data.efficiency.commandsPerTest || 0,
    passRate: data.execution.passRate || 0,
    avgDuration: data.execution.avgDuration || 0,
    totalActions: data.efficiency.totalCommands || 0,
    totalTests: data.execution.totalTests || 0,
    passed: data.execution.passed || 0,
    failed: data.execution.failed || 0
  }));

  const comparisons = transformedData
    .filter(data => data.llm !== baseline.llm)
    .map(data => {
      const baselineCommandsPerTest = baseline.efficiency.commandsPerTest || 0;
      const dataCommandsPerTest = data.efficiency.commandsPerTest || 0;
      const baselinePassRate = baseline.execution.passRate || 0;
      const dataPassRate = data.execution.passRate || 0;
      const baselineAvgDuration = baseline.execution.avgDuration || 0;
      const dataAvgDuration = data.execution.avgDuration || 0;

      return {
        llm: data.llm,
        displayName: data.displayName,
        isMoreEfficient: baselineCommandsPerTest > 0 && dataCommandsPerTest < baselineCommandsPerTest,
        hasHigherPassRate: dataPassRate > baselinePassRate,
        isFaster: baselineAvgDuration > 0 && dataAvgDuration < baselineAvgDuration,
        efficiencyChange: baselineCommandsPerTest > 0 ? 
          ((dataCommandsPerTest - baselineCommandsPerTest) / baselineCommandsPerTest * 100) : 0,
        passRateChange: dataPassRate - baselinePassRate,
        timeChange: baselineAvgDuration > 0 ? 
          ((dataAvgDuration - baselineAvgDuration) / baselineAvgDuration * 100) : 0
      };
    });  return {
    _id: 'latest_action_usage_summary',
    timestamp: new Date().toISOString(),
    totalLLMs: transformedData.length,
    baseline: baseline.llm,
    summary: {
      mostEfficientLLM: {
        llm: mostEfficientLLM.llm,
        displayName: mostEfficientLLM.displayName,
        commandsPerTest: mostEfficientLLM.efficiency.commandsPerTest || 0
      },
      leastEfficientLLM: {
        llm: leastEfficientLLM.llm,
        displayName: leastEfficientLLM.displayName,
        commandsPerTest: leastEfficientLLM.efficiency.commandsPerTest || 0
      },
      highestPassRateLLM: {
        llm: highestPassRateLLM.llm,
        displayName: highestPassRateLLM.displayName,
        passRate: highestPassRateLLM.execution.passRate || 0
      },
      fastestLLM: {
        llm: fastestLLM.llm,
        displayName: fastestLLM.displayName,
        avgDuration: fastestLLM.execution.avgDuration || 0
      },      overallMetrics: {
        avgCommandsPerTest: totalTests > 0 ? totalCommands / totalTests : 0,
        avgPassRate: totalTests > 0 ? totalPassed / totalTests * 100 : 0,
        avgExecutionTime: totalTests > 0 ? totalDuration / totalTests : 0
      },
      actionTypeDistribution: overallActionTypes || {}
    },
    llmAnalyses,
    comparisons
  };
  
  } catch (error) {
    console.error('❌ Error in generateSummaryFromMergedData:', error);
    return null;
  }
}

// Generate comparisons for a specific LLM
function generateComparisonsForLLM(allData, targetLLM) {
  const baseline = allData.find(data => data.llm === 'original') || allData[0];
  const target = allData.find(data => data.llm === targetLLM);
  
  if (!target || !baseline) return [];

  return [generateComparison(target, baseline)];
}

// Generate all comparisons
function generateAllComparisons(allData) {
  const baseline = allData.find(data => data.llm === 'original') || allData[0];
  
  return allData
    .filter(data => data.llm !== baseline.llm)
    .map(target => generateComparison(target, baseline));
}

// Generate individual comparison
function generateComparison(target, baseline) {
  const targetCommandsPerTest = target.summary?.efficiency?.averageCommandsPerTest || 0;
  const baselineCommandsPerTest = baseline.summary?.efficiency?.averageCommandsPerTest || 0;
  
  const targetPassRate = target.summary?.execution?.tests > 0 ? 
    (target.summary.execution.passed || 0) / target.summary.execution.tests * 100 : 0;
  const baselinePassRate = baseline.summary?.execution?.tests > 0 ? 
    (baseline.summary.execution.passed || 0) / baseline.summary.execution.tests * 100 : 0;

  const targetAvgDuration = target.summary?.execution?.stop && target.summary?.execution?.start ? 
    (target.summary.execution.stop - target.summary.execution.start) / target.summary.execution.tests : 0;
  const baselineAvgDuration = baseline.summary?.execution?.stop && baseline.summary?.execution?.start ? 
    (baseline.summary.execution.stop - baseline.summary.execution.start) / baseline.summary.execution.tests : 0;
  // Calculate action type comparison
  const actionTypeComparison = {};
  
  // Use command usage stats if available, otherwise fall back to actionableCommandTypes
  const targetCommandCounts = target.commandUsageStats?.commandCounts || {};
  const baselineCommandCounts = baseline.commandUsageStats?.commandCounts || {};
  
  // Get all unique command types from both datasets
  const allActionTypes = new Set([
    ...Object.keys(targetCommandCounts),
    ...Object.keys(baselineCommandCounts),
    ...(target.uniqueActionableCommandTypes || target.actionableCommandTypes || []),
    ...(baseline.uniqueActionableCommandTypes || baseline.actionableCommandTypes || [])
  ]);

  allActionTypes.forEach(actionType => {
    const targetCount = targetCommandCounts[actionType] || 0;
    const baselineCount = baselineCommandCounts[actionType] || 0;
    
    actionTypeComparison[actionType] = {
      target: targetCount,
      baseline: baselineCount,
      difference: targetCount - baselineCount,
      percentageChange: baselineCount > 0 ? ((targetCount - baselineCount) / baselineCount * 100) : 0
    };
  });

  return {
    _id: `comparison_${target.llm}_vs_${baseline.llm}`,
    target: target.llm,
    targetDisplayName: getLLMDisplayName(target.llm),
    baseline: baseline.llm,
    baselineDisplayName: getLLMDisplayName(baseline.llm),
    timestamp: new Date().toISOString(),
    metrics: {
      actionEfficiency: {
        target: targetCommandsPerTest,
        baseline: baselineCommandsPerTest,
        difference: targetCommandsPerTest - baselineCommandsPerTest,
        percentageChange: baselineCommandsPerTest > 0 ? 
          ((targetCommandsPerTest - baselineCommandsPerTest) / baselineCommandsPerTest * 100) : 0
      },
      executionEfficiency: {
        target: targetPassRate,
        baseline: baselinePassRate,
        difference: targetPassRate - baselinePassRate,
        percentageChange: baselinePassRate > 0 ? 
          ((targetPassRate - baselinePassRate) / baselinePassRate * 100) : 0
      },
      avgExecutionTime: {
        target: targetAvgDuration,
        baseline: baselineAvgDuration,
        difference: targetAvgDuration - baselineAvgDuration,
        percentageChange: baselineAvgDuration > 0 ? 
          ((targetAvgDuration - baselineAvgDuration) / baselineAvgDuration * 100) : 0
      }
    },
    actionTypeComparison,
    summary: {
      isMoreEfficient: baselineCommandsPerTest > 0 && targetCommandsPerTest < baselineCommandsPerTest,
      hasHigherPassRate: targetPassRate > baselinePassRate,
      isFaster: baselineAvgDuration > 0 && targetAvgDuration < baselineAvgDuration
    }
  };
}

// Generate test details for a specific LLM compared to baseline
function generateTestDetailsForLLM(allData, targetLLM) {
  const baseline = allData.find(data => data.llm === 'original') || allData[0];
  const target = allData.find(data => data.llm === targetLLM);
  
  if (!baseline || !target) {
    return null;
  }

  return {
    _id: `test-details_${targetLLM}`,
    target: targetLLM,
    targetDisplayName: getLLMDisplayName(targetLLM),
    baseline: baseline.llm,
    baselineDisplayName: getLLMDisplayName(baseline.llm),
    timestamp: new Date().toISOString(),
    testComparison: generateTestComparison(baseline, target)
  };
}

// Generate test details for all LLMs
function generateAllTestDetails(allData) {
  const baseline = allData.find(data => data.llm === 'original') || allData[0];
  
  return allData
    .filter(data => data.llm !== baseline.llm)
    .map(data => ({
      _id: `test-details_${data.llm}`,
      target: data.llm,
      targetDisplayName: getLLMDisplayName(data.llm),
      baseline: baseline.llm,
      baselineDisplayName: getLLMDisplayName(baseline.llm),
      timestamp: new Date().toISOString(),
      testComparison: generateTestComparison(baseline, data)
    }));
}

// Generate detailed test comparison between baseline and target
function generateTestComparison(baseline, target) {
  const baselineTests = baseline.tests || [];
  const targetTests = target.tests || [];
  
  console.log(`🔍 Comparing ${baselineTests.length} baseline tests with ${targetTests.length} target tests`);
  
  // Create multiple maps for more robust matching
  const targetTestMap = new Map();
  const targetTestByNameOnly = new Map();
  const targetTestByFileOnly = new Map();
  
  targetTests.forEach(test => {
    // Primary key: filename::testname
    const primaryKey = `${test.filename}::${test.name}`;
    targetTestMap.set(primaryKey, test);
    
    // Secondary key: testname only (for fuzzy matching)
    targetTestByNameOnly.set(test.name, test);
    
    // Tertiary key: filename only (to check file existence)
    targetTestByFileOnly.set(test.filename, test);
  });

  // Process each baseline test
  const testComparisons = baselineTests.map(baselineTest => {
    const primaryKey = `${baselineTest.filename}::${baselineTest.name}`;
    let targetTest = targetTestMap.get(primaryKey);
    
    // If not found with primary key, try fuzzy matching by test name only
    if (!targetTest) {
      targetTest = targetTestByNameOnly.get(baselineTest.name);
      if (targetTest) {
        console.log(`🔄 Fuzzy matched: "${baselineTest.name}" from ${baselineTest.filename} to ${targetTest.filename}`);
      }
    }      // Debug logging for unmatched tests
    if (!targetTest) {
      console.log(`❌ No match found for: "${baselineTest.name}" in file "${baselineTest.filename}"`);
      console.log(`   Available target filenames: ${[...targetTestByFileOnly.keys()].slice(0, 5).join(', ')}...`);
    } else {
      if (targetTest.execution?.status) {
        console.log(`✅ Matched: "${baselineTest.name}" → status: ${targetTest.execution.status}`);
      } else {
        console.log(`⚠️ Matched but no execution status for: "${baselineTest.name}"`);
        console.log(`   Target execution:`, targetTest.execution);
      }
    }
    
    return {
      testName: baselineTest.name,
      filename: baselineTest.filename,
      filePath: baselineTest.filePath,
      baseline: {
        executed: true,
        status: baselineTest.execution?.status || 'unknown',
        passed: baselineTest.execution?.status === 'passed',
        duration: baselineTest.execution?.duration || 0,
        actionableCommands: baselineTest.efficiency?.actionableCommands || 0,
        commands: baselineTest.efficiency?.commands || []
      },
      target: targetTest ? {
        executed: true,
        status: targetTest.execution?.status || 'unknown',
        passed: targetTest.execution?.status === 'passed',
        duration: targetTest.execution?.duration || 0,
        actionableCommands: targetTest.efficiency?.actionableCommands || 0,
        commands: targetTest.efficiency?.commands || []
      } : {
        executed: false,
        status: 'not_executed',
        passed: false,
        duration: 0,
        actionableCommands: 0,
        commands: []
      },
      comparison: {
        statusMatch: targetTest ? 
          (baselineTest.execution?.status === targetTest.execution?.status) : false,
        actionsDifference: targetTest ? 
          (targetTest.efficiency?.actionableCommands || 0) - (baselineTest.efficiency?.actionableCommands || 0) : 
          -(baselineTest.efficiency?.actionableCommands || 0),
        durationDifference: targetTest ? 
          (targetTest.execution?.duration || 0) - (baselineTest.execution?.duration || 0) : 
          -(baselineTest.execution?.duration || 0)      }
    };
  });

  // Add tests that are in target but not in baseline
  const processedBaselineKeys = new Set();
  baselineTests.forEach(baselineTest => {
    const primaryKey = `${baselineTest.filename}::${baselineTest.name}`;
    processedBaselineKeys.add(primaryKey);
    // Also add fuzzy match possibilities
    processedBaselineKeys.add(baselineTest.name);
  });

  // Find target tests that weren't matched with any baseline test
  const unmatchedTargetTests = targetTests.filter(targetTest => {
    const primaryKey = `${targetTest.filename}::${targetTest.name}`;
    return !processedBaselineKeys.has(primaryKey) && !processedBaselineKeys.has(targetTest.name);
  });

  console.log(`🔍 Found ${unmatchedTargetTests.length} target tests not in baseline`);

  // Add unmatched target tests to the comparison
  unmatchedTargetTests.forEach(targetTest => {
    console.log(`➕ Adding target-only test: "${targetTest.name}" in file "${targetTest.filename}"`);
    testComparisons.push({
      testName: targetTest.name,
      filename: targetTest.filename,
      filePath: targetTest.filePath,
      baseline: {
        executed: false,
        status: 'not_in_baseline',
        passed: false,
        duration: 0,
        actionableCommands: 0,
        commands: []
      },
      target: {
        executed: true,
        status: targetTest.execution?.status || 'unknown',
        passed: targetTest.execution?.status === 'passed',
        duration: targetTest.execution?.duration || 0,
        actionableCommands: targetTest.efficiency?.actionableCommands || 0,
        commands: targetTest.efficiency?.commands || []
      },
      comparison: {
        statusMatch: false, // Can't match since no baseline
        actionsDifference: targetTest.efficiency?.actionableCommands || 0,
        durationDifference: targetTest.execution?.duration || 0
      }
    });
  });
  // Calculate summary statistics (after adding target-only tests)
  const totalBaselineTests = baselineTests.length;
  const totalTargetTests = testComparisons.filter(t => t.target.executed).length;
  const matchingPassed = testComparisons.filter(t => 
    t.baseline.passed && t.target.passed
  ).length;
  const matchingFailed = testComparisons.filter(t => 
    !t.baseline.passed && !t.target.passed
  ).length;
  const baselinePassed = testComparisons.filter(t => t.baseline.passed).length;
  const targetPassed = testComparisons.filter(t => t.target.passed).length;

  return {
    tests: testComparisons,
    summary: {
      totalBaselineTests,
      totalTargetTests,
      executionRate: totalBaselineTests > 0 ? (totalTargetTests / totalBaselineTests * 100) : 0,
      matchingPassed,
      matchingFailed,
      baselinePassedTests: baselinePassed,
      targetPassedTests: targetPassed,
      baselinePassRate: totalBaselineTests > 0 ? (baselinePassed / totalBaselineTests * 100) : 0,
      targetPassRate: totalTargetTests > 0 ? (targetPassed / totalTargetTests * 100) : 0
    }
  };
}
