'use client';

import React, { useState, useEffect } from 'react';

// Interfaces for Action Usage Analysis data
interface ActionAnalysis {
  _id: string;
  llm: string;
  displayName: string;
  timestamp: string;
  actions: {
    total: number;
    byType: { [actionType: string]: number };
    byTest: Array<{
      filePath: string;
      orderInFile: number;
      actionableCommands: number;
      commands: string[];
    }>;
    patterns: {
      mostUsedActions: Array<[string, number]>;
      leastUsedActions: Array<[string, number]>;
      actionDistribution: { [actionType: string]: { count: number; percentage: number } };
      testComplexity: {
        simple: number;    // 1-5 actions
        medium: number;    // 6-15 actions  
        complex: number;   // 16+ actions
      };
    };
  };
  efficiency: {
    totalTests: number;
    totalCommands: number;
    commandsPerTest: number;
    avgExecutionTime: number;
  };
  execution: {
    totalTests: number;
    passed: number;
    failed: number;
    passRate: number;
    avgDuration: number;
  };
}

interface ActionComparison {
  _id: string;
  target: string;
  targetDisplayName: string;
  baseline: string;
  baselineDisplayName: string;
  timestamp: string;
  metrics: {
    actionEfficiency: {
      target: number;
      baseline: number;
      difference: number;
      percentageChange: number;
    };
    executionEfficiency: {
      target: number;
      baseline: number;
      difference: number;
      percentageChange: number;
    };
    avgExecutionTime: {
      target: number;
      baseline: number;
      difference: number;
      percentageChange: number;
    };
  };
  actionTypeComparison: {
    [actionType: string]: {
      target: number;
      baseline: number;
      difference: number;
      percentageChange: number;
    };
  };
  summary: {
    isMoreEfficient: boolean;
    hasHigherPassRate: boolean;
    isFaster: boolean;
  };
}

// New interfaces for test details
interface TestDetails {
  testName: string;
  filename: string;
  filePath: string;
  baseline: {
    executed: boolean;
    status: string;
    passed: boolean;
    duration: number;
    actionableCommands: number;
    commands: string[];
  };
  target: {
    executed: boolean;
    status: string;
    passed: boolean;
    duration: number;
    actionableCommands: number;
    commands: string[];
  };
  comparison: {
    statusMatch: boolean;
    actionsDifference: number;
    durationDifference: number;
  };
}

interface TestDetailsComparison {
  _id: string;
  target: string;
  targetDisplayName: string;
  baseline: string;
  baselineDisplayName: string;
  timestamp: string;
  testComparison: {
    tests: TestDetails[];
    summary: {
      totalBaselineTests: number;
      totalTargetTests: number;
      executionRate: number;
      matchingPassed: number;
      matchingFailed: number;
      baselinePassedTests: number;
      targetPassedTests: number;
      baselinePassRate: number;
      targetPassRate: number;
    };
  };
}

interface ActionSummary {
  _id: string;
  timestamp: string;
  totalLLMs: number;
  baseline: string;
  summary: {
    mostEfficientLLM: {
      llm: string;
      displayName: string;
      commandsPerTest: number;
    };
    leastEfficientLLM: {
      llm: string;
      displayName: string;
      commandsPerTest: number;
    };
    highestPassRateLLM: {
      llm: string;
      displayName: string;
      passRate: number;
    };
    fastestLLM: {
      llm: string;
      displayName: string;
      avgDuration: number;
    };
    actionTypeDistribution: { [actionType: string]: number };
    overallMetrics: {
      avgCommandsPerTest: number;
      avgPassRate: number;
      avgExecutionTime: number;
    };
  };
  llmAnalyses: Array<{
    llm: string;
    displayName: string;
    commandsPerTest: number;
    passRate: number;
    avgDuration: number;
    totalActions: number;
    totalTests: number;
    passed: number;
    failed: number;
  }>;
  comparisons: Array<{
    llm: string;
    displayName: string;
    isMoreEfficient: boolean;
    hasHigherPassRate: boolean;
    isFaster: boolean;
    efficiencyChange: number;
    passRateChange: number;
    timeChange: number;
  }>;
}

const ActionUsageComparisonView: React.FC = () => {
  const [actionSummary, setActionSummary] = useState<ActionSummary | null>(null);
  const [actionAnalyses, setActionAnalyses] = useState<ActionAnalysis[]>([]);
  const [actionComparisons, setActionComparisons] = useState<ActionComparison[]>([]);
  const [testDetails, setTestDetails] = useState<TestDetailsComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<string>('');
  const [selectedView, setSelectedView] = useState<'summary' | 'detailed' | 'comparison'>('summary');
  const [availableLLMs, setAvailableLLMs] = useState<Array<{key: string, displayName: string}>>([]);

  useEffect(() => {
    fetchActionUsageData();
  }, []);

  const fetchActionUsageData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch action usage summary
      const summaryResponse = await fetch('/api/mongo/action-usage-analysis?type=summary&latest=true');
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch action usage summary');
      }
      const summaryData = await summaryResponse.json();
      setActionSummary(summaryData);

      // Fetch all action analyses
      const analysesResponse = await fetch('/api/mongo/action-usage-analysis?type=analysis&latest=true');
      if (!analysesResponse.ok) {
        throw new Error('Failed to fetch action analyses');
      }
      const analysesData = await analysesResponse.json();
      setActionAnalyses(Array.isArray(analysesData) ? analysesData : []);

      // Fetch all comparisons
      const comparisonsResponse = await fetch('/api/mongo/action-usage-analysis?type=comparison&latest=true');
      if (!comparisonsResponse.ok) {
        throw new Error('Failed to fetch action comparisons');
      }
      const comparisonsData = await comparisonsResponse.json();
      setActionComparisons(Array.isArray(comparisonsData) ? comparisonsData : []);

      // Fetch test details
      const testDetailsResponse = await fetch('/api/mongo/action-usage-analysis?type=test-details&latest=true');
      if (!testDetailsResponse.ok) {
        throw new Error('Failed to fetch test details');
      }
      const testDetailsData = await testDetailsResponse.json();
      setTestDetails(Array.isArray(testDetailsData) ? testDetailsData : []);

      // Fetch available LLMs
      const llmListResponse = await fetch('/api/mongo/action-usage-analysis?type=llm-list');
      if (!llmListResponse.ok) {
        throw new Error('Failed to fetch LLM list');
      }
      const llmListData = await llmListResponse.json();
      setAvailableLLMs(Array.isArray(llmListData) ? llmListData : []);

      console.log('✅ Action Usage Analysis data loaded successfully');
      console.log('Summary:', summaryData);
      console.log('Analyses:', analysesData?.length || 0, 'items');
      console.log('Comparisons:', comparisonsData?.length || 0, 'items');
      console.log('Test Details:', testDetailsData?.length || 0, 'items');
      console.log('Available LLMs:', llmListData?.length || 0, 'items');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Error fetching action usage data:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    try {
      const response = await fetch('/api/mongo/action-usage-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'trigger-analysis' }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger analysis');
      }

      const result = await response.json();
      alert(result.message + '\n\nCommand: ' + result.command);
      
      // Reload data after triggering analysis
      setTimeout(() => {
        fetchActionUsageData();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert('Error triggering analysis: ' + errorMessage);
    }
  };

  const renderActionDistributionChart = (actionDistribution: { [actionType: string]: { count: number; percentage: number } }) => {
    const actionTypes = Object.keys(actionDistribution);
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        {actionTypes.map((actionType, index) => (
          <div key={actionType} className="text-center p-2 bg-gray-800 rounded">
            <div 
              className="w-full h-4 rounded mb-1"
              style={{ 
                backgroundColor: colors[index % colors.length],
                opacity: 0.8
              }}
            />
            <div className="text-xs font-medium text-white">{actionType}</div>
            <div className="text-xs text-gray-300">
              {actionDistribution[actionType].count} ({actionDistribution[actionType].percentage.toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSummaryView = () => {
    if (!actionSummary) {
      return <div className="text-center py-8 text-gray-300">No summary data available</div>;
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-300 mb-2">Action Usage Analysis Summary</h2>
          <p className="text-blue-200">
            Analysis of {actionSummary.totalLLMs} LLMs compared to baseline: {actionSummary.baseline}
          </p>
          <p className="text-sm text-blue-300 mt-1">
            Last updated: {new Date(actionSummary.timestamp).toLocaleString()}
          </p>
        </div>

        {/* LLM Performance Comparison Table - Now at the Top */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">LLM Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-left text-gray-200 font-semibold">LLM</th>
                  <th className="px-4 py-3 text-center text-gray-200 font-semibold">Executed Tests</th>
                  <th className="px-4 py-3 text-center text-gray-200 font-semibold">Passed Tests</th>
                  <th className="px-4 py-3 text-center text-gray-200 font-semibold">Overall Performance</th>
                </tr>
              </thead>              <tbody>
                {(() => {
                  // Find the original (baseline) LLM data to get total tests
                  const originalLLM = actionSummary.llmAnalyses.find(llm => llm.llm === 'original');
                  const totalTestsFromOriginal = originalLLM ? originalLLM.totalTests : actionSummary.llmAnalyses[0]?.totalTests || 0;
                    // Calculate overall performance scores for sorting
                  const llmsWithPerformance = actionSummary.llmAnalyses.map(llm => {
                    const executionRate = totalTestsFromOriginal > 0 ? (llm.totalTests / totalTestsFromOriginal) * 100 : 0;
                    const passRate = llm.totalTests > 0 ? (llm.passed / llm.totalTests) * 100 : 0; // Pass rate based on executed tests
                    
                    // Overall performance: 60% execution rate + 40% pass rate of executed tests
                    // This gives more weight to actually executing tests, then passing the ones that were executed
                    const overallScore = (executionRate * 0.6) + (passRate * 0.4);
                    
                    return { ...llm, overallScore, executionRate, passRate };
                  });
                  
                  return llmsWithPerformance
                    .sort((a, b) => b.overallScore - a.overallScore) // Sort by overall performance (highest first)
                    .map((llm, index) => (
                      <tr key={llm.llm} className={`hover:bg-gray-600 ${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                        <td className="px-4 py-3 font-medium text-white">
                          {llm.displayName}
                          {llm.llm === 'original' && <span className="ml-2 text-xs text-blue-300">(Baseline)</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-white font-semibold">
                            {llm.totalTests}/{totalTestsFromOriginal}
                          </div>
                          <div className="text-xs text-gray-400">
                            {llm.executionRate.toFixed(1)}% executed
                          </div>
                        </td>                        <td className="px-4 py-3 text-center">
                          <div className="text-white font-semibold">{llm.passed}</div>
                          <div className="text-xs text-gray-400">
                            {llm.passRate.toFixed(1)}% pass rate
                          </div>
                        </td><td className="px-4 py-3 text-center">
                          <div className={`text-lg font-bold ${
                            llm.overallScore >= 80 ? 'text-green-400' :
                            llm.overallScore >= 60 ? 'text-yellow-400' :
                            llm.overallScore >= 40 ? 'text-orange-400' : 'text-red-400'
                          }`}>
                            {llm.overallScore.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {llm.executionRate.toFixed(1)}% exec + {llm.passRate.toFixed(1)}% pass
                          </div>
                        </td>
                      </tr>
                    ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-green-600 rounded-lg p-4">
            <h3 className="font-semibold text-green-300 mb-2">Most Efficient</h3>
            <div className="text-lg font-bold text-green-200">{actionSummary.summary.mostEfficientLLM.displayName}</div>
            <div className="text-sm text-green-300">{actionSummary.summary.mostEfficientLLM.commandsPerTest.toFixed(1)} commands/test</div>
          </div>

          <div className="bg-gray-800 border border-blue-600 rounded-lg p-4">
            <h3 className="font-semibold text-blue-300 mb-2">Highest Pass Rate</h3>
            <div className="text-lg font-bold text-blue-200">{actionSummary.summary.highestPassRateLLM.displayName}</div>
            <div className="text-sm text-blue-300">{actionSummary.summary.highestPassRateLLM.passRate.toFixed(1)}% passed</div>
          </div>

          <div className="bg-gray-800 border border-purple-600 rounded-lg p-4">
            <h3 className="font-semibold text-purple-300 mb-2">Fastest Execution</h3>
            <div className="text-lg font-bold text-purple-200">{actionSummary.summary.fastestLLM.displayName}</div>
            <div className="text-sm text-purple-300">{actionSummary.summary.fastestLLM.avgDuration.toFixed(0)}ms avg</div>
          </div>

          <div className="bg-gray-800 border border-orange-600 rounded-lg p-4">
            <h3 className="font-semibold text-orange-300 mb-2">Overall Averages</h3>
            <div className="text-sm text-orange-200">
              <div>{actionSummary.summary.overallMetrics.avgCommandsPerTest.toFixed(1)} commands/test</div>
              <div>{actionSummary.summary.overallMetrics.avgPassRate.toFixed(1)}% pass rate</div>
              <div>{actionSummary.summary.overallMetrics.avgExecutionTime.toFixed(0)}ms execution</div>
            </div>
          </div>
        </div>

        {/* Action Type Distribution */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Action Type Distribution Across All LLMs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(actionSummary.summary.actionTypeDistribution).map(([actionType, count], index) => (
              <div key={actionType} className="text-center p-3 bg-gray-700 rounded">
                <div className="text-sm font-medium text-gray-200">{actionType}</div>
                <div className="text-lg font-bold text-blue-400">{count}</div>
                <div className="text-xs text-gray-400">total uses</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedView = () => {
    const selectedAnalysis = actionAnalyses.find(a => a.llm === selectedLLM);
    const selectedTestDetails = testDetails.find(td => td.target === selectedLLM);
    
    if (!selectedAnalysis) {
      return <div className="text-center py-8 text-gray-300">Select an LLM to view detailed analysis</div>;
    }

    return (
      <div className="space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-white">{selectedAnalysis.displayName} - Detailed Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Action Summary */}
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-blue-300 mb-3">Action Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Actions:</span>
                  <span className="font-medium text-white">{selectedAnalysis.actions.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Commands per Test:</span>
                  <span className="font-medium text-white">{selectedAnalysis.efficiency.commandsPerTest.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Tests:</span>
                  <span className="font-medium text-white">{selectedAnalysis.efficiency.totalTests}</span>
                </div>
              </div>
            </div>

            {/* Execution Summary */}
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-green-300 mb-3">Execution Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Pass Rate:</span>
                  <span className="font-medium text-white">{selectedAnalysis.execution.passRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Passed:</span>
                  <span className="font-medium text-white">{selectedAnalysis.execution.passed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Failed:</span>
                  <span className="font-medium text-white">{selectedAnalysis.execution.failed}</span>
                </div>
              </div>
            </div>

            {/* Test Complexity */}
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-purple-300 mb-3">Test Complexity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Simple (1-5):</span>
                  <span className="font-medium text-white">{selectedAnalysis.actions.patterns.testComplexity.simple}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Medium (6-15):</span>
                  <span className="font-medium text-white">{selectedAnalysis.actions.patterns.testComplexity.medium}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Complex (16+):</span>
                  <span className="font-medium text-white">{selectedAnalysis.actions.patterns.testComplexity.complex}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Distribution */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3 text-white">Action Type Distribution</h3>
            {renderActionDistributionChart(selectedAnalysis.actions.patterns.actionDistribution)}
          </div>

          {/* Most/Least Used Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="font-semibold mb-3 text-white">Most Used Actions</h3>
              <div className="space-y-2">
                {selectedAnalysis.actions.patterns.mostUsedActions.slice(0, 5).map(([action, count]) => (
                  <div key={action} className="flex justify-between text-sm bg-gray-700 p-2 rounded">
                    <span className="text-gray-300">{action}</span>
                    <span className="font-medium text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-white">Least Used Actions</h3>
              <div className="space-y-2">
                {selectedAnalysis.actions.patterns.leastUsedActions.slice(0, 5).map(([action, count]) => (
                  <div key={action} className="flex justify-between text-sm bg-gray-700 p-2 rounded">
                    <span className="text-gray-300">{action}</span>
                    <span className="font-medium text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comprehensive Test Details */}
        {selectedTestDetails && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-white">
              Test-by-Test Comparison with {selectedTestDetails.baselineDisplayName}
            </h3>
            
            {/* Test Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-blue-400">
                  {selectedTestDetails.testComparison.summary.totalTargetTests}/{selectedTestDetails.testComparison.summary.totalBaselineTests}
                </div>
                <div className="text-xs text-gray-300">Tests Executed</div>
                <div className="text-xs text-blue-300">
                  {selectedTestDetails.testComparison.summary.executionRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-green-400">
                  {selectedTestDetails.testComparison.summary.targetPassedTests}
                </div>
                <div className="text-xs text-gray-300">Tests Passed</div>
                <div className="text-xs text-green-300">
                  {selectedTestDetails.testComparison.summary.targetPassRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {selectedTestDetails.testComparison.summary.matchingPassed}
                </div>
                <div className="text-xs text-gray-300">Matching Passed</div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-red-400">
                  {selectedTestDetails.testComparison.summary.matchingFailed}
                </div>
                <div className="text-xs text-gray-300">Matching Failed</div>
              </div>
            </div>

            {/* Test Details Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-200">Test Name</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Baseline Status</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Target Status</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Actions Used</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Duration (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTestDetails.testComparison.tests.map((test, index) => (
                    <tr key={`${test.filename}-${test.testName}`} className={`hover:bg-gray-600 ${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-white font-medium truncate max-w-xs" title={test.testName}>
                          {test.testName}
                        </div>
                        <div className="text-gray-400 text-xs truncate max-w-xs" title={test.filename}>
                          {test.filename}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          test.baseline.passed ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                        }`}>
                          {test.baseline.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {test.target.executed ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            test.target.passed ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                          }`}>
                            {test.target.status}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-600 text-gray-300">
                            Not executed
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <div className="text-white">
                          {test.baseline.actionableCommands} → {test.target.actionableCommands}
                        </div>
                        {test.comparison.actionsDifference !== 0 && (
                          <div className={`text-xs ${test.comparison.actionsDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {test.comparison.actionsDifference > 0 ? '+' : ''}{test.comparison.actionsDifference}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <div className="text-white">
                          {test.baseline.duration} → {test.target.duration}
                        </div>
                        {test.comparison.durationDifference !== 0 && (
                          <div className={`text-xs ${test.comparison.durationDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {test.comparison.durationDifference > 0 ? '+' : ''}{test.comparison.durationDifference}ms
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderComparisonView = () => {
    const selectedComparison = actionComparisons.find(c => c.target === selectedLLM);
    const selectedTestDetails = testDetails.find(td => td.target === selectedLLM);
    
    if (!selectedComparison) {
      return <div className="text-center py-8 text-gray-300">Select an LLM to view comparison with baseline</div>;
    }

    return (
      <div className="space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-white">
            {selectedComparison.targetDisplayName} vs {selectedComparison.baselineDisplayName}
          </h2>

          {/* Key Metrics Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-blue-300 mb-3">Action Efficiency</h3>
              <div className="text-2xl font-bold text-white mb-2">
                {selectedComparison.metrics.actionEfficiency.target.toFixed(1)} 
                <span className="text-sm text-gray-400 ml-1">vs {selectedComparison.metrics.actionEfficiency.baseline.toFixed(1)}</span>
              </div>
              <div className={`text-sm font-medium ${
                selectedComparison.metrics.actionEfficiency.percentageChange > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {selectedComparison.metrics.actionEfficiency.percentageChange > 0 ? '+' : ''}
                {selectedComparison.metrics.actionEfficiency.percentageChange.toFixed(1)}% change
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-green-300 mb-3">Execution Efficiency</h3>
              <div className="text-2xl font-bold text-white mb-2">
                {selectedComparison.metrics.executionEfficiency.target.toFixed(1)}%
                <span className="text-sm text-gray-400 ml-1">vs {selectedComparison.metrics.executionEfficiency.baseline.toFixed(1)}%</span>
              </div>
              <div className={`text-sm font-medium ${
                selectedComparison.metrics.executionEfficiency.percentageChange > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {selectedComparison.metrics.executionEfficiency.percentageChange > 0 ? '+' : ''}
                {selectedComparison.metrics.executionEfficiency.percentageChange.toFixed(1)}% change
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-purple-300 mb-3">Execution Time</h3>
              <div className="text-2xl font-bold text-white mb-2">
                {selectedComparison.metrics.avgExecutionTime.target.toFixed(0)}ms
                <span className="text-sm text-gray-400 ml-1">vs {selectedComparison.metrics.avgExecutionTime.baseline.toFixed(0)}ms</span>
              </div>
              <div className={`text-sm font-medium ${
                selectedComparison.metrics.avgExecutionTime.percentageChange > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {selectedComparison.metrics.avgExecutionTime.percentageChange > 0 ? '+' : ''}
                {selectedComparison.metrics.avgExecutionTime.percentageChange.toFixed(1)}% change
              </div>
            </div>
          </div>

          {/* Action Type Comparison */}
          <div className="bg-gray-700 p-4 rounded mb-6">
            <h3 className="font-semibold text-white mb-4">Action Type Usage Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-600">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-200">Action Type</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Target</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Baseline</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Difference</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-200">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(selectedComparison.actionTypeComparison).map(([actionType, comparison], index) => (
                    <tr key={actionType} className={`${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                      <td className="px-3 py-2 text-xs font-medium text-white">{actionType}</td>
                      <td className="px-3 py-2 text-center text-xs text-white">{comparison.target}</td>
                      <td className="px-3 py-2 text-center text-xs text-white">{comparison.baseline}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        <span className={`${comparison.difference > 0 ? 'text-red-400' : comparison.difference < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          {comparison.difference > 0 ? '+' : ''}{comparison.difference}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <span className={`${comparison.percentageChange > 0 ? 'text-red-400' : comparison.percentageChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          {comparison.percentageChange > 0 ? '+' : ''}{comparison.percentageChange.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="font-semibold text-white mb-3">Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${selectedComparison.summary.isMoreEfficient ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-300">
                  {selectedComparison.summary.isMoreEfficient ? 'More Efficient' : 'Less Efficient'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${selectedComparison.summary.hasHigherPassRate ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-300">
                  {selectedComparison.summary.hasHigherPassRate ? 'Higher Pass Rate' : 'Lower Pass Rate'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${selectedComparison.summary.isFaster ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-300">
                  {selectedComparison.summary.isFaster ? 'Faster Execution' : 'Slower Execution'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comprehensive Test Comparison */}
        {selectedTestDetails && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-white">
              Comprehensive Test Comparison with {selectedTestDetails.baselineDisplayName}
            </h3>
            
            {/* Test Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-blue-400">
                  {selectedTestDetails.testComparison.summary.totalTargetTests}/{selectedTestDetails.testComparison.summary.totalBaselineTests}
                </div>
                <div className="text-xs text-gray-300">Tests Executed</div>
                <div className="text-xs text-blue-300">
                  {selectedTestDetails.testComparison.summary.executionRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-green-400">
                  {selectedTestDetails.testComparison.summary.targetPassedTests}
                </div>
                <div className="text-xs text-gray-300">Tests Passed</div>
                <div className="text-xs text-green-300">
                  {selectedTestDetails.testComparison.summary.targetPassRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {selectedTestDetails.testComparison.summary.matchingPassed}
                </div>
                <div className="text-xs text-gray-300">Both Passed</div>
              </div>
              <div className="bg-gray-700 p-3 rounded text-center">
                <div className="text-lg font-bold text-red-400">
                  {selectedTestDetails.testComparison.summary.matchingFailed}
                </div>
                <div className="text-xs text-gray-300">Both Failed</div>
              </div>
            </div>

            {/* Detailed Test List with filters */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-300">Filter by status:</span>
                <button className="px-2 py-1 text-xs bg-green-600 text-white rounded">Both Passed</button>
                <button className="px-2 py-1 text-xs bg-red-600 text-white rounded">Both Failed</button>
                <button className="px-2 py-1 text-xs bg-yellow-600 text-white rounded">Status Mismatch</button>
                <button className="px-2 py-1 text-xs bg-gray-600 text-white rounded">Not Executed</button>
                <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded">All Tests</button>
              </div>
            </div>

            {/* Comprehensive Test Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-200">Test Name</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-200">Baseline</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-200">Target</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-200">Status Match</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-200">Actions</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-200">Duration</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-200">Commands</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTestDetails.testComparison.tests.map((test, index) => (
                    <tr key={`${test.filename}-${test.testName}`} className={`hover:bg-gray-600 ${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                      <td className="px-2 py-2">
                        <div className="text-white font-medium truncate max-w-xs" title={test.testName}>
                          {test.testName}
                        </div>
                        <div className="text-gray-400 text-xs truncate max-w-xs" title={test.filename}>
                          {test.filename}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          test.baseline.passed ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                        }`}>
                          {test.baseline.status}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{test.baseline.duration}ms</div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {test.target.executed ? (
                          <>
                            <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              test.target.passed ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                            }`}>
                              {test.target.status}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{test.target.duration}ms</div>
                          </>
                        ) : (
                          <div className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-600 text-gray-300">
                            Not executed
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          test.comparison.statusMatch ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="text-white">
                          {test.baseline.actionableCommands} → {test.target.actionableCommands}
                        </div>
                        {test.comparison.actionsDifference !== 0 && (
                          <div className={`text-xs ${test.comparison.actionsDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {test.comparison.actionsDifference > 0 ? '+' : ''}{test.comparison.actionsDifference}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {test.comparison.durationDifference !== 0 && (
                          <div className={`text-xs ${test.comparison.durationDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {test.comparison.durationDifference > 0 ? '+' : ''}{test.comparison.durationDifference}ms
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="text-xs text-gray-400">
                          B: {test.baseline.commands.length} | T: {test.target.commands.length}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-blue-300">Loading Action Usage Analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-300 mb-2">Error Loading Data</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <button 
            onClick={fetchActionUsageData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!actionSummary && !actionAnalyses.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-300 mb-2">No Data Available</h2>
          <p className="text-gray-400 mb-4">No action usage analysis data found. Click below to trigger a new analysis.</p>
          <button 
            onClick={triggerAnalysis}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Trigger Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Navigation */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-blue-300 mb-4">Action Usage Analysis Dashboard</h1>
          
          {/* View Toggle */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedView('summary')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedView === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setSelectedView('detailed')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedView === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Detailed Analysis
            </button>
            <button
              onClick={() => setSelectedView('comparison')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedView === 'comparison'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Comparison
            </button>
          </div>

          {/* LLM Selector (for detailed and comparison views) */}
          {(selectedView === 'detailed' || selectedView === 'comparison') && (
            <div className="flex items-center gap-4">
              <label className="text-gray-300 font-medium">Select LLM:</label>
              <select
                value={selectedLLM}
                onChange={(e) => setSelectedLLM(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an LLM...</option>
                {availableLLMs
                  .filter(llm => llm.key !== 'original') // Exclude baseline from selection
                  .map(llm => (
                    <option key={llm.key} value={llm.key}>
                      {llm.displayName}
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button 
              onClick={fetchActionUsageData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              Refresh Data
            </button>
            <button 
              onClick={triggerAnalysis}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              Trigger New Analysis
            </button>
          </div>
        </div>

        {/* Content */}
        {selectedView === 'summary' && renderSummaryView()}
        {selectedView === 'detailed' && renderDetailedView()}
        {selectedView === 'comparison' && renderComparisonView()}
      </div>
    </div>
  );
};

export default ActionUsageComparisonView;
