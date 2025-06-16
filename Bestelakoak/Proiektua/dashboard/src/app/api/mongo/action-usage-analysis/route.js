import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'tests';

// Collection names
const COLLECTIONS = {
  MERGED_TEST_DATA: 'merged_test_data'
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
        // Generate summary from all LLM data
        console.log('📊 Generating summary...');
        const allData = await collection.find({}).toArray();
        console.log(`📊 Found ${allData.length} records for summary`);
        
        if (allData.length === 0) {
          console.log('⚠️ No data found for summary generation');
          result = {
            error: 'No data available',
            message: 'No LLM data found in database. Please run the backend processing script first.'
          };
        } else {
          result = generateSummaryFromMergedData(allData);
          console.log('📊 Summary generated:', result ? 'Success' : 'Failed');
          if (!result) {
            result = {
              error: 'Summary generation failed',
              message: 'Failed to generate summary from available data'
            };
          }
        }
        break;

      case 'analysis':
        if (llm) {
          // Get specific LLM analysis
          result = await collection.findOne({ llm });
          if (result) {
            result = transformToAnalysisFormat(result);
          }
        } else {
          // Get all analyses
          const allAnalyses = await collection.find({}).toArray();
          result = allAnalyses.map(data => transformToAnalysisFormat(data));
        }
        break;      case 'comparison':
        // Generate comparisons between LLMs
        const comparisonData = await collection.find({}).toArray();
        if (llm) {
          result = generateComparisonsForLLM(comparisonData, llm);
        } else {
          result = generateAllComparisons(comparisonData);
        }
        break;

      case 'test-details':
        // Get detailed test comparison data
        const testDetailsData = await collection.find({}).toArray();
        if (llm) {
          result = generateTestDetailsForLLM(testDetailsData, llm);
        } else {
          result = generateAllTestDetails(testDetailsData);
        }
        break;

      case 'stats':
        // Get collection statistics
        const count = await collection.countDocuments();
        const latestRecord = await collection.findOne({}, { sort: { timestamp: -1 } });
        
        result = {
          [COLLECTIONS.MERGED_TEST_DATA]: {
            count,
            latestDate: latestRecord?.timestamp || null
          }
        };
        break;

      case 'llm-list':
        // Get list of available LLMs
        const llmList = await collection.distinct('llm');
        result = llmList.map(llm => ({
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
