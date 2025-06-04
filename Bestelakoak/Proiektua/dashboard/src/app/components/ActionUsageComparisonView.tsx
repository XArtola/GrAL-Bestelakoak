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
          <div key={actionType} className="text-center p-2 bg-gray-50 rounded">
            <div 
              className="w-full h-4 rounded mb-1"
              style={{ 
                backgroundColor: colors[index % colors.length],
                opacity: 0.8
              }}
            />
            <div className="text-xs font-medium">{actionType}</div>
            <div className="text-xs text-gray-600">
              {actionDistribution[actionType].count} ({actionDistribution[actionType].percentage.toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSummaryView = () => {
    if (!actionSummary) {
      return <div className="text-center py-8">No summary data available</div>;
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Action Usage Analysis Summary</h2>
          <p className="text-blue-700">
            Analysis of {actionSummary.totalLLMs} LLMs compared to baseline: {actionSummary.baseline}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Last updated: {new Date(actionSummary.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Most Efficient</h3>
            <div className="text-lg font-bold text-green-800">{actionSummary.summary.mostEfficientLLM.displayName}</div>
            <div className="text-sm text-green-600">{actionSummary.summary.mostEfficientLLM.commandsPerTest.toFixed(1)} commands/test</div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Highest Pass Rate</h3>
            <div className="text-lg font-bold text-blue-800">{actionSummary.summary.highestPassRateLLM.displayName}</div>
            <div className="text-sm text-blue-600">{actionSummary.summary.highestPassRateLLM.passRate.toFixed(1)}% passed</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Fastest Execution</h3>
            <div className="text-lg font-bold text-purple-800">{actionSummary.summary.fastestLLM.displayName}</div>
            <div className="text-sm text-purple-600">{actionSummary.summary.fastestLLM.avgDuration.toFixed(0)}ms avg</div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">Overall Averages</h3>
            <div className="text-sm text-orange-800">
              <div>{actionSummary.summary.overallMetrics.avgCommandsPerTest.toFixed(1)} commands/test</div>
              <div>{actionSummary.summary.overallMetrics.avgPassRate.toFixed(1)}% pass rate</div>
              <div>{actionSummary.summary.overallMetrics.avgExecutionTime.toFixed(0)}ms execution</div>
            </div>
          </div>
        </div>

        {/* Action Type Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Action Type Distribution Across All LLMs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(actionSummary.summary.actionTypeDistribution).map(([actionType, count], index) => (
              <div key={actionType} className="text-center p-3 bg-gray-50 rounded">
                <div className="text-sm font-medium text-gray-900">{actionType}</div>
                <div className="text-lg font-bold text-blue-600">{count}</div>
                <div className="text-xs text-gray-500">total uses</div>
              </div>
            ))}
          </div>
        </div>

        {/* LLM Comparison Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">LLM Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">LLM</th>
                  <th className="px-4 py-2 text-right">Commands/Test</th>
                  <th className="px-4 py-2 text-right">Pass Rate</th>
                  <th className="px-4 py-2 text-right">Avg Duration</th>
                  <th className="px-4 py-2 text-right">Total Actions</th>
                  <th className="px-4 py-2 text-center">vs Baseline</th>
                </tr>
              </thead>
              <tbody>
                {actionSummary.llmAnalyses.map((llm, index) => {
                  const comparison = actionSummary.comparisons.find(c => c.llm === llm.llm);
                  return (
                    <tr key={llm.llm} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-2 font-medium">{llm.displayName}</td>
                      <td className="px-4 py-2 text-right">{llm.commandsPerTest.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right">{llm.passRate.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right">{llm.avgDuration.toFixed(0)}ms</td>
                      <td className="px-4 py-2 text-right">{llm.totalActions}</td>
                      <td className="px-4 py-2 text-center">
                        {comparison && (
                          <div className="flex justify-center space-x-1">
                            <span className={`inline-block w-3 h-3 rounded-full ${comparison.isMoreEfficient ? 'bg-green-500' : 'bg-red-500'}`} title={`${comparison.isMoreEfficient ? 'More' : 'Less'} efficient`}></span>
                            <span className={`inline-block w-3 h-3 rounded-full ${comparison.hasHigherPassRate ? 'bg-green-500' : 'bg-red-500'}`} title={`${comparison.hasHigherPassRate ? 'Higher' : 'Lower'} pass rate`}></span>
                            <span className={`inline-block w-3 h-3 rounded-full ${comparison.isFaster ? 'bg-green-500' : 'bg-red-500'}`} title={`${comparison.isFaster ? 'Faster' : 'Slower'} execution`}></span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedView = () => {
    const selectedAnalysis = actionAnalyses.find(a => a.llm === selectedLLM);
    if (!selectedAnalysis) {
      return <div className="text-center py-8">Select an LLM to view detailed analysis</div>;
    }

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">{selectedAnalysis.displayName} - Detailed Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Action Summary */}
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-900 mb-3">Action Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Actions:</span>
                  <span className="font-medium">{selectedAnalysis.actions.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Commands per Test:</span>
                  <span className="font-medium">{selectedAnalysis.efficiency.commandsPerTest.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tests:</span>
                  <span className="font-medium">{selectedAnalysis.efficiency.totalTests}</span>
                </div>
              </div>
            </div>

            {/* Execution Summary */}
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-900 mb-3">Execution Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pass Rate:</span>
                  <span className="font-medium">{selectedAnalysis.execution.passRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Passed:</span>
                  <span className="font-medium">{selectedAnalysis.execution.passed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="font-medium">{selectedAnalysis.execution.failed}</span>
                </div>
              </div>
            </div>

            {/* Test Complexity */}
            <div className="bg-purple-50 p-4 rounded">
              <h3 className="font-semibold text-purple-900 mb-3">Test Complexity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Simple (1-5):</span>
                  <span className="font-medium">{selectedAnalysis.actions.patterns.testComplexity.simple}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium (6-15):</span>
                  <span className="font-medium">{selectedAnalysis.actions.patterns.testComplexity.medium}</span>
                </div>
                <div className="flex justify-between">
                  <span>Complex (16+):</span>
                  <span className="font-medium">{selectedAnalysis.actions.patterns.testComplexity.complex}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Distribution */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Action Type Distribution</h3>
            {renderActionDistributionChart(selectedAnalysis.actions.patterns.actionDistribution)}
          </div>

          {/* Most/Least Used Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="font-semibold mb-3">Most Used Actions</h3>
              <div className="space-y-2">
                {selectedAnalysis.actions.patterns.mostUsedActions.slice(0, 5).map(([action, count]) => (
                  <div key={action} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                    <span>{action}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Least Used Actions</h3>
              <div className="space-y-2">
                {selectedAnalysis.actions.patterns.leastUsedActions.slice(0, 5).map(([action, count]) => (
                  <div key={action} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                    <span>{action}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComparisonView = () => {
    const selectedComparison = actionComparisons.find(c => c.target === selectedLLM);
    if (!selectedComparison) {
      return <div className="text-center py-8">Select an LLM to view comparison with baseline</div>;
    }

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {selectedComparison.targetDisplayName} vs {selectedComparison.baselineDisplayName}
          </h2>

          {/* Key Metrics Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-900 mb-3">Action Efficiency</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="font-medium">{selectedComparison.metrics.actionEfficiency.target.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Baseline:</span>
                  <span className="font-medium">{selectedComparison.metrics.actionEfficiency.baseline.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className={`font-medium ${selectedComparison.metrics.actionEfficiency.percentageChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedComparison.metrics.actionEfficiency.percentageChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-900 mb-3">Execution Efficiency</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="font-medium">{selectedComparison.metrics.executionEfficiency.target.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Baseline:</span>
                  <span className="font-medium">{selectedComparison.metrics.executionEfficiency.baseline.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className={`font-medium ${selectedComparison.metrics.executionEfficiency.percentageChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedComparison.metrics.executionEfficiency.percentageChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded">
              <h3 className="font-semibold text-purple-900 mb-3">Execution Time</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Target:</span>
                  <span className="font-medium">{selectedComparison.metrics.avgExecutionTime.target.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Baseline:</span>
                  <span className="font-medium">{selectedComparison.metrics.avgExecutionTime.baseline.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className={`font-medium ${selectedComparison.metrics.avgExecutionTime.percentageChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedComparison.metrics.avgExecutionTime.percentageChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Indicators */}
          <div className="bg-gray-50 p-4 rounded mb-6">
            <h3 className="font-semibold mb-3">Performance Summary</h3>
            <div className="flex space-x-6">
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-4 h-4 rounded-full ${selectedComparison.summary.isMoreEfficient ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm">{selectedComparison.summary.isMoreEfficient ? 'More Efficient' : 'Less Efficient'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-4 h-4 rounded-full ${selectedComparison.summary.hasHigherPassRate ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm">{selectedComparison.summary.hasHigherPassRate ? 'Higher Pass Rate' : 'Lower Pass Rate'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-4 h-4 rounded-full ${selectedComparison.summary.isFaster ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm">{selectedComparison.summary.isFaster ? 'Faster' : 'Slower'}</span>
              </div>
            </div>
          </div>

          {/* Action Type Comparison */}
          <div>
            <h3 className="font-semibold mb-3">Action Type Comparison</h3>
            <div className="space-y-2">
              {Object.entries(selectedComparison.actionTypeComparison).map(([actionType, comparison]) => (
                <div key={actionType} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">{actionType}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm">Target: {comparison.target}</span>
                    <span className="text-sm">Baseline: {comparison.baseline}</span>
                    <span className={`text-sm font-medium ${comparison.percentageChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {comparison.percentageChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading action usage data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error loading data</h3>
        <p className="text-red-700">{error}</p>
        <button 
          onClick={fetchActionUsageData} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!actionSummary && !actionAnalyses.length) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-semibold">No Data Available</h3>
        <p className="text-yellow-700">No action usage analysis data found. Please run the analysis first.</p>
        <button 
          onClick={triggerAnalysis} 
          className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Run Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedView('summary')}
              className={`px-4 py-2 rounded ${selectedView === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Summary
            </button>
            <button
              onClick={() => setSelectedView('detailed')}
              className={`px-4 py-2 rounded ${selectedView === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Detailed Analysis
            </button>
            <button
              onClick={() => setSelectedView('comparison')}
              className={`px-4 py-2 rounded ${selectedView === 'comparison' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Baseline Comparison
            </button>
          </div>
          
          {(selectedView === 'detailed' || selectedView === 'comparison') && (
            <select
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an LLM</option>
              {availableLLMs.map(llm => (
                <option key={llm.key} value={llm.key}>{llm.displayName}</option>
              ))}
            </select>
          )}

          <button 
            onClick={triggerAnalysis} 
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Run Analysis
          </button>
        </div>
      </div>

      {/* Content */}
      {selectedView === 'summary' && renderSummaryView()}
      {selectedView === 'detailed' && renderDetailedView()}
      {selectedView === 'comparison' && renderComparisonView()}
    </div>
  );
};

export default ActionUsageComparisonView;
