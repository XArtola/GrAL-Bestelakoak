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

    switch (type) {
      case 'summary':
        // Generate summary from all LLM data
        const allData = await collection.find({}).toArray();
        result = generateSummaryFromMergedData(allData);
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
    'claude_3_7_thinking': 'Claude 3.7 Thinking',
    'claude_sonnet_4': 'Claude Sonnet 4',
    'gemini_2_5_pro_preview': 'Gemini 2.5 Pro Preview',
    'gpt_4o': 'GPT-4o',
    'o4_mini_preview': 'O4 Mini Preview'
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
  const leastUsedActions = sortedActions.slice(-5).reverse();

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
        actionDistribution,
        testComplexity
      }
    },
    efficiency: {
      totalTests: summary.efficiency.totalTestCases || 0,
      totalCommands: summary.efficiency.totalActionableCommands || 0,
      commandsPerTest: summary.efficiency.averageCommandsPerTest || 0,
      avgExecutionTime: summary.execution.stop && summary.execution.start ? 
        (summary.execution.stop - summary.execution.start) / summary.execution.tests : 0
    },
    execution: {
      totalTests: summary.execution.tests || 0,
      passed: summary.execution.passed || 0,
      failed: summary.execution.failed || 0,
      passRate: summary.execution.tests > 0 ? 
        (summary.execution.passed || 0) / summary.execution.tests * 100 : 0,
      avgDuration: summary.execution.stop && summary.execution.start ? 
        (summary.execution.stop - summary.execution.start) / summary.execution.tests : 0
    }
  };
}

// Generate summary from all merged data
function generateSummaryFromMergedData(allData) {
  if (!allData || allData.length === 0) return null;

  const baseline = allData.find(data => data.llm === 'original') || allData[0];
  
  // Find most efficient LLM (lowest commands per test)
  let mostEfficientLLM = allData[0];
  let leastEfficientLLM = allData[0];
  let highestPassRateLLM = allData[0];
  let fastestLLM = allData[0];

  allData.forEach(data => {
    const commandsPerTest = data.summary?.efficiency?.averageCommandsPerTest || 0;
    const passRate = data.summary?.execution?.tests > 0 ? 
      (data.summary.execution.passed || 0) / data.summary.execution.tests * 100 : 0;
    const avgDuration = data.summary?.execution?.stop && data.summary?.execution?.start ? 
      (data.summary.execution.stop - data.summary.execution.start) / data.summary.execution.tests : 0;

    if (commandsPerTest > 0 && (mostEfficientLLM.summary?.efficiency?.averageCommandsPerTest || Infinity) > commandsPerTest) {
      mostEfficientLLM = data;
    }
    if (commandsPerTest > (leastEfficientLLM.summary?.efficiency?.averageCommandsPerTest || 0)) {
      leastEfficientLLM = data;
    }
    if (passRate > (highestPassRateLLM.summary?.execution?.tests > 0 ? 
        (highestPassRateLLM.summary.execution.passed || 0) / highestPassRateLLM.summary.execution.tests * 100 : 0)) {
      highestPassRateLLM = data;
    }
    if (avgDuration > 0 && avgDuration < (fastestLLM.summary?.execution?.stop && fastestLLM.summary?.execution?.start ? 
        (fastestLLM.summary.execution.stop - fastestLLM.summary.execution.start) / fastestLLM.summary.execution.tests : Infinity)) {
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

  // Calculate overall metrics
  const totalTests = allData.reduce((sum, data) => sum + (data.summary?.execution?.tests || 0), 0);
  const totalCommands = allData.reduce((sum, data) => sum + (data.summary?.efficiency?.totalActionableCommands || 0), 0);
  const totalDuration = allData.reduce((sum, data) => {
    const duration = data.summary?.execution?.stop && data.summary?.execution?.start ? 
      data.summary.execution.stop - data.summary.execution.start : 0;
    return sum + duration;
  }, 0);
  const totalPassed = allData.reduce((sum, data) => sum + (data.summary?.execution?.passed || 0), 0);
  const llmAnalyses = allData.map(data => ({
    llm: data.llm,
    displayName: getLLMDisplayName(data.llm),
    commandsPerTest: data.summary?.efficiency?.averageCommandsPerTest || 0,
    passRate: data.summary?.execution?.tests > 0 ? 
      (data.summary.execution.passed || 0) / data.summary.execution.tests * 100 : 0,
    avgDuration: data.summary?.execution?.stop && data.summary?.execution?.start ? 
      (data.summary.execution.stop - data.summary.execution.start) / data.summary.execution.tests : 0,
    totalActions: data.summary?.efficiency?.totalActionableCommands || 0,
    totalTests: data.summary?.execution?.tests || 0,
    passed: data.summary?.execution?.passed || 0,
    failed: data.summary?.execution?.failed || 0
  }));

  const comparisons = allData
    .filter(data => data.llm !== baseline.llm)
    .map(data => {
      const baselineCommandsPerTest = baseline.summary?.efficiency?.averageCommandsPerTest || 0;
      const dataCommandsPerTest = data.summary?.efficiency?.averageCommandsPerTest || 0;
      const baselinePassRate = baseline.summary?.execution?.tests > 0 ? 
        (baseline.summary.execution.passed || 0) / baseline.summary.execution.tests * 100 : 0;
      const dataPassRate = data.summary?.execution?.tests > 0 ? 
        (data.summary.execution.passed || 0) / data.summary.execution.tests * 100 : 0;
      const baselineAvgDuration = baseline.summary?.execution?.stop && baseline.summary?.execution?.start ? 
        (baseline.summary.execution.stop - baseline.summary.execution.start) / baseline.summary.execution.tests : 0;
      const dataAvgDuration = data.summary?.execution?.stop && data.summary?.execution?.start ? 
        (data.summary.execution.stop - data.summary.execution.start) / data.summary.execution.tests : 0;

      return {
        llm: data.llm,
        displayName: getLLMDisplayName(data.llm),
        isMoreEfficient: baselineCommandsPerTest > 0 && dataCommandsPerTest < baselineCommandsPerTest,
        hasHigherPassRate: dataPassRate > baselinePassRate,
        isFaster: baselineAvgDuration > 0 && dataAvgDuration < baselineAvgDuration,
        efficiencyChange: baselineCommandsPerTest > 0 ? 
          ((dataCommandsPerTest - baselineCommandsPerTest) / baselineCommandsPerTest * 100) : 0,
        passRateChange: dataPassRate - baselinePassRate,
        timeChange: baselineAvgDuration > 0 ? 
          ((dataAvgDuration - baselineAvgDuration) / baselineAvgDuration * 100) : 0
      };
    });

  return {
    _id: 'latest_action_usage_summary',
    timestamp: new Date().toISOString(),
    totalLLMs: allData.length,
    baseline: baseline.llm,
    summary: {
      mostEfficientLLM: {
        llm: mostEfficientLLM.llm,
        displayName: getLLMDisplayName(mostEfficientLLM.llm),
        commandsPerTest: mostEfficientLLM.summary?.efficiency?.averageCommandsPerTest || 0
      },
      leastEfficientLLM: {
        llm: leastEfficientLLM.llm,
        displayName: getLLMDisplayName(leastEfficientLLM.llm),
        commandsPerTest: leastEfficientLLM.summary?.efficiency?.averageCommandsPerTest || 0
      },
      highestPassRateLLM: {
        llm: highestPassRateLLM.llm,
        displayName: getLLMDisplayName(highestPassRateLLM.llm),
        passRate: highestPassRateLLM.summary?.execution?.tests > 0 ? 
          (highestPassRateLLM.summary.execution.passed || 0) / highestPassRateLLM.summary.execution.tests * 100 : 0
      },
      fastestLLM: {
        llm: fastestLLM.llm,
        displayName: getLLMDisplayName(fastestLLM.llm),
        avgDuration: fastestLLM.summary?.execution?.stop && fastestLLM.summary?.execution?.start ? 
          (fastestLLM.summary.execution.stop - fastestLLM.summary.execution.start) / fastestLLM.summary.execution.tests : 0
      },
      actionTypeDistribution: overallActionTypes,
      overallMetrics: {
        avgCommandsPerTest: totalTests > 0 ? totalCommands / totalTests : 0,
        avgPassRate: totalTests > 0 ? totalPassed / totalTests * 100 : 0,
        avgExecutionTime: totalTests > 0 ? totalDuration / totalTests : 0
      }
    },
    llmAnalyses,
    comparisons
  };
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
  const allActionTypes = new Set([
    ...(target.actionableCommandTypes || []),
    ...(baseline.actionableCommandTypes || [])
  ]);

  allActionTypes.forEach(actionType => {
    const targetCount = (target.actionableCommandTypes || []).filter(type => type === actionType).length;
    const baselineCount = (baseline.actionableCommandTypes || []).filter(type => type === actionType).length;
    
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
  
  // Create a map of target tests by name for quick lookup
  const targetTestMap = new Map();
  targetTests.forEach(test => {
    const key = `${test.filename}::${test.name}`;
    targetTestMap.set(key, test);
  });

  // Process each baseline test
  const testComparisons = baselineTests.map(baselineTest => {
    const key = `${baselineTest.filename}::${baselineTest.name}`;
    const targetTest = targetTestMap.get(key);
    
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
          -(baselineTest.execution?.duration || 0)
      }
    };
  });

  // Calculate summary statistics
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
