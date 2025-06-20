"use client";
import React, { useState, useEffect } from "react";
import { normalizeLlmName, getLlmDisplayName } from "../../services/llmService";

interface LlmTestData {
  llms: string[];
  testNames: string[];
  testData: {
    llmName: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    tests: {
      testName: string;
      status: string;
      executionTime: number;
      generationTime: number;
      filePath?: string;
    }[];
  }[];
}

interface EfficiencyMetrics {
  codeQuality: number;
  generationSpeed: number;
  executionSuccess: number;
  codeReuse: number;
}

interface PerformanceMetrics {
  avgGenerationTime: number;
  testCount: number;
  passRate: number;
  emptyCodeRatio: number;
}

interface LLMRanking {
  rank: number;
  llm: string;
  overallScore: number;
  codeQuality: number;
  generationSpeed: number;
  executionSuccess: number;
  codeReuse: number;
  avgGenerationTime: number;
  testCount: number;
  passRate: number;
  emptyCodeRatio: number;
  // Support for both old and new data structures
  metrics?: EfficiencyMetrics;
  performance?: PerformanceMetrics;
}

interface EfficiencyData {
  timestamp: string;
  reportDate: string;
  summary: {
    topPerformer: string;
    avgEfficiencyScore: number;
    totalTestsAnalyzed: number;
    totalLLMs: number;
  };
  weights: {
    codeQuality: number;
    generationSpeed: number;
    executionSuccess: number;
    codeReuse: number;
  };
  rankings: LLMRanking[];
  insights?: {
    performanceGap: number;
    fastestLLM: string;
    mostAccurateLLM: string;
    avgGenerationTime: number;
    avgPassRate: number;
  };
}

interface LlmTestComparisonViewProps {
  loading: boolean;
  testData: LlmTestData | null;
}

export default function LlmTestComparisonView({ loading, testData }: LlmTestComparisonViewProps) {
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData | null>(null);
  const [efficiencyLoading, setEfficiencyLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'efficiency' | 'methodology' | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [llmDisplayNames, setLlmDisplayNames] = useState<Record<string, string>>({});

  // Helper function to get display name for LLM
  const getDisplayName = (llmName: string): string => {
    return llmDisplayNames[llmName] || getLlmDisplayName(llmName);
  };

  // Initialize tab state from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('dashboard-active-tab') as 'performance' | 'efficiency' | 'methodology';
    if (savedTab && ['performance', 'efficiency', 'methodology'].includes(savedTab)) {
      setActiveTab(savedTab);
    } else {
      setActiveTab('performance'); // Default tab if nothing saved
    }
    setIsMounted(true);
  }, []);

  // Fetch LLM display names from MongoDB
  useEffect(() => {
    async function fetchLlmDisplayNames() {
      try {
        const response = await fetch('/api/llm-names');
        if (response.ok) {
          const data = await response.json();
          setLlmDisplayNames(data);
        } else {
          console.log('LLM display names not available, using defaults');
        }
      } catch (error) {
        console.error('Error loading LLM display names:', error);
      }
    }

    fetchLlmDisplayNames();
  }, []);

  // Persist tab changes to localStorage
  const handleTabChange = (tab: 'performance' | 'efficiency' | 'methodology') => {
    setActiveTab(tab);
    localStorage.setItem('dashboard-active-tab', tab);
  };

  // Load efficiency data
  useEffect(() => {
    async function loadEfficiencyData() {
      setEfficiencyLoading(true);
      try {
        const response = await fetch('/api/efficiency');
        if (response.ok) {
          const data = await response.json();
          setEfficiencyData(data);
        } else {
          console.log('Efficiency data not available yet');
        }
      } catch (error) {
        console.error('Error loading efficiency data:', error);
      } finally {
        setEfficiencyLoading(false);
      }
    }

    loadEfficiencyData();
  }, []);
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">Loading LLM test comparison data...</p>
      </div>
    );
  }

  if (!testData || !testData.testData || !Array.isArray(testData.testData) || testData.testData.length === 0) {
    return (
      <div className="p-4 border border-yellow-500 bg-yellow-900 bg-opacity-20 rounded">
        <p>No LLM test comparison data available.</p>
      </div>
    );
  }
  // Prevent hydration mismatch by not rendering until mounted and tab is loaded
  if (!isMounted || activeTab === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }
  
  const hasTestData = testData && testData.testData && Array.isArray(testData.testData);
  // Function to extract filename without path and extension
  const extractFilename = (filePath: string): string => {
    if (!filePath) return '';
    // Handle both forward and backward slashes for cross-platform compatibility
    const parts = filePath.split(/[\\\/]/);
    const filename = parts[parts.length - 1];
    return filename.replace('.spec.ts', '');
  };

  // Function to extract base prefix from filename (removes numbers at the end)
  const extractFilePrefix = (fileName: string): string => {
    if (!fileName) return '';
    // Remove numbers at the end of the filename to group similar files
    // e.g., "auth1", "auth2", "auth3" -> "auth"
    return fileName.replace(/\d+$/, '');
  };

  // Process and sort test data by file name
  let processedTestNames: { testName: string; filePath: string; fileName: string }[] = [];
  
  if (hasTestData) {
    // Collect all test names with their file paths
    testData.testNames.forEach((testName: string) => {
      let filePath = '';
      if (testData.testData.length > 0) {
        for (const llmData of testData.testData) {
          const test = llmData.tests.find((t: any) => t.testName === testName);
          if (test && test.filePath) {
            filePath = test.filePath;            break;
          }
        }
      }
      const fileName = extractFilename(filePath);
      processedTestNames.push({ testName, filePath, fileName });
    });
    
    // Sort by file name
    processedTestNames.sort((a, b) => a.fileName.localeCompare(b.fileName));
  }
  return (
    <>      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('performance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Test Performance
            </button>
            <button
              onClick={() => handleTabChange('efficiency')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'efficiency'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >              Efficiency Analysis
              {efficiencyLoading && <span className="ml-2 text-xs">(Loading...)</span>}
              {!efficiencyData && !efficiencyLoading && <span className="ml-2 text-xs text-yellow-400">(Not Available)</span>}
              {efficiencyData && !efficiencyData.summary && !efficiencyLoading && <span className="ml-2 text-xs text-red-400">(Invalid Data)</span>}
            </button>
            <button
              onClick={() => handleTabChange('methodology')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'methodology'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Methodology
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'performance' && (
        <>          {/* Summary Table */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">LLM Test Summary</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-white">LLM Name</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white">Total Tests</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white">Passed</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white">Failed</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white">Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {hasTestData && testData.testData.map((llm, index) => {
                const passRate = llm.totalTests > 0 
                  ? ((llm.passedTests / llm.totalTests) * 100).toFixed(1) + '%' 
                  : 'N/A';
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-4 py-3 text-left font-medium">{getDisplayName(llm.llmName)}</td>
                    <td className="px-4 py-3 text-right">{llm.totalTests}</td>
                    <td className="px-4 py-3 text-right text-green-400">{llm.passedTests}</td>
                    <td className="px-4 py-3 text-right text-red-400">{llm.failedTests}</td>
                    <td className="px-4 py-3 text-right font-medium">{passRate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        {/* Detailed Test Comparison Tables by File */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Test Details by LLM</h2>
          {hasTestData && (() => {
          // Group tests by file prefix (removing numbers)
          const testsByFilePrefix = processedTestNames.reduce((acc, item) => {
            const filePrefix = extractFilePrefix(item.fileName);
            const groupKey = filePrefix || item.fileName; // Use original name if no prefix extracted
            
            if (!acc[groupKey]) {
              acc[groupKey] = [];
            }
            acc[groupKey].push(item);
            return acc;
          }, {} as Record<string, typeof processedTestNames>);

          return Object.entries(testsByFilePrefix).map(([groupName, tests]) => (
            <div key={groupName} className="mb-8">
              <h3 className="text-lg font-medium mb-3 text-blue-400 capitalize">
                {groupName} 
                {tests.length > 1 && (
                  <span className="text-sm text-gray-400 ml-2">
                    ({tests.length} files)
                  </span>
                )}
              </h3>              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                  <thead className="bg-gray-700">
                    <tr>                      {tests.length > 1 && (
                        <th className="px-4 py-3 text-left text-sm font-medium text-white w-24">File</th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-medium text-white w-60">Test Name</th>
                      {testData.llms.map((llmName, index) => (
                        <th key={index} className="px-2 py-3 text-center text-xs font-medium text-white" colSpan={2}>
                          {getDisplayName(llmName)}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {tests.length > 1 && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-white"></th>
                      )}
                      <th className="px-4 py-2 text-left text-xs font-medium text-white"></th>
                      {testData.llms.map((_, index) => (
                        <React.Fragment key={index}>
                          <th className="px-2 py-2 text-center text-xs font-medium text-white">Gen Time (s)</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-white">Exec Time (s)</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((item, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>                        {tests.length > 1 && (
                          <td className="px-4 py-3 text-left text-xs w-24 text-gray-400">
                            {item.fileName}
                          </td>
                        )}
                        <td className="px-4 py-3 text-left text-sm w-60 whitespace-normal break-words leading-tight">
                          {item.testName}
                        </td>
                        {testData.testData.map((llm, llmIndex) => {
                          // Find test data for this LLM and test
                          const test = llm.tests.find((t: any) => t.testName === item.testName);
                          // Get status for background color
                          const bgColorClass = test 
                            ? test.status === 'passed' 
                              ? 'bg-green-900 bg-opacity-40' 
                              : 'bg-red-900 bg-opacity-40'
                            : '';
                          
                          return (
                            <React.Fragment key={`${rowIndex}-${llmIndex}`}>
                              <td className={`px-2 py-3 text-right text-xs w-16 ${bgColorClass}`}>
                                {test && test.generationTime ? `${(test.generationTime / 1000).toFixed(1)}s` : '-'}
                              </td>
                              <td className={`px-2 py-3 text-right text-xs w-16 ${bgColorClass}`}>
                                {test ? `${(test.executionTime / 1000).toFixed(1)}s` : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ));
        })()}
      </div>
      </>
      )}

      {activeTab === 'efficiency' && (
        <>
          {efficiencyLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-lg">Loading efficiency analysis data...</p>
            </div>          ) : !efficiencyData || !efficiencyData.summary ? (
            <div className="p-4 border border-yellow-500 bg-yellow-900 bg-opacity-20 rounded">
              <p className="text-yellow-400 font-medium">Efficiency Analysis Not Available</p>
              <p className="text-sm text-gray-300 mt-2">
                To view efficiency metrics, run the efficiency analyzer:
              </p>
              <pre className="bg-gray-800 p-2 rounded mt-2 text-xs">
                cd efficiency_alalyzer{'\n'}
                node efficiency_analyzer.js{'\n'}
                cd ../dashboard{'\n'}
                node scripts/load-efficiency-data.js
              </pre>
            </div>
          ) : (
            <>
              {/* Efficiency Summary */}
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-100">Top Performer</h3>
                    <p className="text-xl font-bold text-white">{efficiencyData.summary.topPerformer}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-100">Avg Efficiency</h3>
                    <p className="text-xl font-bold text-white">{(efficiencyData.summary.avgEfficiencyScore * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-100">Tests Analyzed</h3>
                    <p className="text-xl font-bold text-white">{efficiencyData.summary.totalTestsAnalyzed}</p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-orange-100">LLMs Compared</h3>
                    <p className="text-xl font-bold text-white">{efficiencyData.summary.totalLLMs}</p>
                  </div>
                </div>
              </div>

              {/* LLM Rankings */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">LLM Efficiency Rankings</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white">Rank</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white">LLM</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-white">Overall Score</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-white">Code Quality</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-white">Generation Speed</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-white">Execution Success</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-white">Code Reuse</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-white">Avg Gen Time</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-white">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {efficiencyData.rankings.map((ranking, index) => {
                        const rankColorClass = ranking.rank === 1 
                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-yellow-100' 
                          : ranking.rank === 2 
                          ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-gray-100'
                          : ranking.rank === 3
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-orange-100'
                          : '';
                        
                        return (
                          <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} ${rankColorClass && 'bg-opacity-50'}`}>
                            <td className={`px-4 py-3 text-center font-bold ${rankColorClass ? 'text-white' : ''}`}>
                              #{ranking.rank}
                            </td>
                            <td className="px-4 py-3 text-left font-medium">
                              {getDisplayName(ranking.llm)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-green-400">
                              {(ranking.overallScore * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(ranking.metrics?.codeQuality !== undefined ? (ranking.metrics.codeQuality * 100).toFixed(1) : 'N/A')}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(ranking.metrics?.generationSpeed !== undefined ? (ranking.metrics.generationSpeed * 100).toFixed(1) : 'N/A')}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(ranking.metrics?.executionSuccess !== undefined ? (ranking.metrics.executionSuccess * 100).toFixed(1) : 'N/A')}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(ranking.metrics?.codeReuse !== undefined ? (ranking.metrics.codeReuse * 100).toFixed(1) : 'N/A')}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(ranking.performance?.avgGenerationTime !== undefined ? (ranking.performance.avgGenerationTime / 1000).toFixed(1) : 'N/A')}s
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(ranking.performance?.passRate !== undefined ? (ranking.performance.passRate * 100).toFixed(1) : 'N/A')}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>              {/* Efficiency Insights */}
              {(() => {
                // Calculate insights from available data
                const insights = efficiencyData.insights || (() => {
                  if (!efficiencyData.rankings || efficiencyData.rankings.length === 0) {
                    return {
                      performanceGap: 0,
                      fastestLLM: 'N/A',
                      mostAccurateLLM: 'N/A',
                      avgPassRate: 0
                    };
                  }

                  const rankings = efficiencyData.rankings;
                  const topScore = rankings[0]?.overallScore || 0;
                  const bottomScore = rankings[rankings.length - 1]?.overallScore || 0;
                  const performanceGap = topScore - bottomScore;

                  // Find fastest LLM (highest generation speed or lowest avg generation time)
                  const fastestLLM = rankings.reduce((fastest, current) => {
                    const currentGenTime = current.performance?.avgGenerationTime || current.avgGenerationTime || Infinity;
                    const fastestGenTime = fastest.performance?.avgGenerationTime || fastest.avgGenerationTime || Infinity;
                    return currentGenTime < fastestGenTime ? current : fastest;
                  }).llm;

                  // Find most accurate LLM (highest pass rate)
                  const mostAccurateLLM = rankings.reduce((mostAccurate, current) => {
                    const currentPassRate = current.performance?.passRate || current.passRate || 0;
                    const bestPassRate = mostAccurate.performance?.passRate || mostAccurate.passRate || 0;
                    return currentPassRate > bestPassRate ? current : mostAccurate;
                  }).llm;

                  // Calculate average pass rate
                  const avgPassRate = rankings.reduce((sum, ranking) => {
                    const passRate = ranking.performance?.passRate || ranking.passRate || 0;
                    return sum + passRate;
                  }, 0) / rankings.length;

                  return {
                    performanceGap,
                    fastestLLM,
                    mostAccurateLLM,
                    avgPassRate
                  };
                })();

                return (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Key Insights</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-blue-400 mb-2">Performance Gap</h3>
                        <p className="text-2xl font-bold text-white">{(insights.performanceGap * 100).toFixed(1)}%</p>
                        <p className="text-sm text-gray-300">Difference between top and bottom performer</p>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-green-400 mb-2">Fastest LLM</h3>
                        <p className="text-lg font-bold text-white">{getDisplayName(insights.fastestLLM)}</p>
                        <p className="text-sm text-gray-300">Lowest average generation time</p>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-purple-400 mb-2">Most Accurate</h3>
                        <p className="text-lg font-bold text-white">{getDisplayName(insights.mostAccurateLLM)}</p>
                        <p className="text-sm text-gray-300">Highest pass rate</p>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-orange-400 mb-2">Avg Pass Rate</h3>
                        <p className="text-2xl font-bold text-white">{(insights.avgPassRate * 100).toFixed(1)}%</p>
                        <p className="text-sm text-gray-300">Across all LLMs</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Methodology */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-300 mb-2">Analysis Methodology</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Efficiency scores are calculated using weighted metrics:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-400">Code Quality:</span>
                    <span className="ml-1">{(efficiencyData.weights.codeQuality * 100)}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-400">Execution Success:</span>
                    <span className="ml-1">{(efficiencyData.weights.executionSuccess * 100)}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-purple-400">Generation Speed:</span>
                    <span className="ml-1">{(efficiencyData.weights.generationSpeed * 100)}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-orange-400">Code Reuse:</span>
                    <span className="ml-1">{(efficiencyData.weights.codeReuse * 100)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Report generated: {new Date(efficiencyData.timestamp).toLocaleString()}
                </p>
              </div>
            </>          )}
        </>
      )}

      {activeTab === 'methodology' && (
        <div className="max-w-none">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">LLM Efficiency Measurement Methodology</h1>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-lg">
              <p className="text-blue-100 font-medium">Document Version: 1.0</p>
              <p className="text-blue-100">Generated: May 25, 2025</p>
              <p className="text-blue-100">Analyzer: LLM Efficiency Analyzer v1.0</p>
            </div>
          </div>

          {/* Overview */}
          <div className="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Overview</h2>
            <p className="text-gray-300 leading-relaxed">
              This methodology explains the comprehensive approach used to measure and compare the efficiency of different 
              Large Language Models (LLMs) in generating Cypress test code. The analysis combines performance metrics (speed) 
              with quality metrics (code quality, execution success) to provide a holistic efficiency assessment.
            </p>
          </div>

          {/* Data Sources */}
          <div className="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-green-400">Data Sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-300 mb-2">1. Generation Time Data</h3>
                <p className="text-sm text-gray-300 mb-2"><strong>Source:</strong> matched_data/*.json files</p>
                <p className="text-sm text-gray-300 mb-2"><strong>Content:</strong> LLM response times with generated code snippets</p>
                <div className="text-xs text-gray-400">
                  <p>• durationMs: Time taken by LLM to generate response</p>
                  <p>• code: Generated Cypress test code</p>
                  <p>• timestamp: When the generation occurred</p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-300 mb-2">2. Test Execution Results</h3>
                <p className="text-sm text-gray-300 mb-2"><strong>Source:</strong> cypress-realworld-app/ctrf/results*.json files (CTRF format)</p>
                <p className="text-sm text-gray-300 mb-2"><strong>Content:</strong> Actual test execution outcomes when running generated tests</p>
                <div className="text-xs text-gray-400">
                  <p>• summary.tests: Total number of tests</p>
                  <p>• summary.passed: Number of tests that passed</p>
                  <p>• summary.failed: Number of tests that failed</p>
                  <p>• summary.duration: Total execution time</p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-300 mb-2">3. Generated Code Analysis</h3>
                <p className="text-sm text-gray-300 mb-2"><strong>Source:</strong> Code snippets from generation time data</p>
                <p className="text-sm text-gray-300 mb-2"><strong>Analysis:</strong> Pattern matching for Cypress-specific constructs and test quality</p>
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-6 text-purple-400">Core Efficiency Metrics & Weights Explained</h2>
            
            {/* Overall Formula */}
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h3 className="text-xl font-medium text-yellow-400 mb-3">Overall Efficiency Formula</h3>
              <div className="bg-gray-900 p-4 rounded font-mono text-green-400">
                Overall Efficiency = (<br/>
                &nbsp;&nbsp;Code Quality × 40% +<br/>
                &nbsp;&nbsp;Execution Success × 30% +<br/>
                &nbsp;&nbsp;Generation Speed × 20% +<br/>
                &nbsp;&nbsp;Code Reuse × 10%<br/>
                )
              </div>
            </div>

            {/* Metric Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Code Quality */}
              <div className="bg-gray-700 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">🎯</span>
                  <h3 className="text-xl font-medium text-blue-400">1. Code Quality Score (Weight: 40%)</h3>
                </div>
                <p className="text-sm text-blue-200 mb-3">
                  <strong>Why 40%:</strong> Code quality is the most important metric because generating syntactically correct, 
                  meaningful test code is the primary purpose of the LLM. Poor quality code renders speed irrelevant.
                </p>
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-300 mb-2">What it measures:</p>
                  <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                    <li>Syntactic correctness of generated Cypress test code</li>
                    <li>Proper usage of Cypress API patterns and conventions</li>
                    <li>Meaningful test structure and organization</li>
                    <li>Adherence to testing best practices</li>
                  </ul>
                </div>
                <div className="bg-gray-900 p-3 rounded text-xs">
                  <p className="text-green-400 mb-2">Calculation Method:</p>
                  <p className="text-gray-300">Base Score = 0.5 (for non-empty code)</p>
                  <p className="text-gray-300">+ Pattern bonuses (cy.* commands, assertions, etc.)</p>
                  <p className="text-gray-300">Maximum Score: 1.0 (capped)</p>
                </div>
              </div>

              {/* Execution Success */}
              <div className="bg-gray-700 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">✅</span>
                  <h3 className="text-xl font-medium text-green-400">2. Execution Success Rate (Weight: 30%)</h3>
                </div>
                <p className="text-sm text-green-200 mb-3">
                  <strong>Why 30%:</strong> The second most important metric because code that doesn't execute successfully 
                  is fundamentally flawed, regardless of how well-written it appears.
                </p>
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-300 mb-2">What it measures:</p>
                  <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                    <li>Percentage of generated tests that pass when executed</li>
                    <li>Real-world functionality and correctness</li>
                    <li>Integration with the actual application under test</li>
                    <li>Absence of runtime errors and failures</li>
                  </ul>
                </div>
                <div className="bg-gray-900 p-3 rounded text-xs">
                  <p className="text-green-400 mb-2">Calculation Method:</p>
                  <p className="text-gray-300">Pass Rate = (Passed Tests / Total Tests Executed)</p>
                  <p className="text-gray-300">Linear scaling from 0.0 to 1.0</p>
                </div>
              </div>

              {/* Generation Speed */}
              <div className="bg-gray-700 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">⚡</span>
                  <h3 className="text-xl font-medium text-purple-400">3. Generation Speed (Weight: 20%)</h3>
                </div>
                <p className="text-sm text-purple-200 mb-3">
                  <strong>Why 20%:</strong> Speed is important for developer productivity and workflow efficiency, 
                  but secondary to quality and correctness.
                </p>
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-300 mb-2">What it measures:</p>
                  <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                    <li>Time taken by the LLM to generate test code responses</li>
                    <li>Consistency of response times across different prompts</li>
                    <li>Efficiency of the model in producing output</li>
                  </ul>
                </div>
                <div className="bg-gray-900 p-3 rounded text-xs">
                  <p className="text-green-400 mb-2">Calculation Method:</p>
                  <p className="text-gray-300">Min-max normalization across all LLMs</p>
                  <p className="text-gray-300">Fastest time → 1.0 score, Slowest → 0.0 score</p>
                </div>
              </div>

              {/* Code Reuse */}
              <div className="bg-gray-700 p-5 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-2">♻️</span>
                  <h3 className="text-xl font-medium text-orange-400">4. Code Reuse Efficiency (Weight: 10%)</h3>
                </div>
                <p className="text-sm text-orange-200 mb-3">
                  <strong>Why 10%:</strong> While important for code maintainability, it's the least critical for 
                  initial test generation effectiveness.
                </p>
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-300 mb-2">What it measures:</p>
                  <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                    <li>LLM's ability to generate non-empty, meaningful code consistently</li>
                    <li>Avoidance of placeholder text, empty responses, or generic templates</li>
                    <li>Consistency in code generation across different prompts</li>
                  </ul>
                </div>
                <div className="bg-gray-900 p-3 rounded text-xs">
                  <p className="text-green-400 mb-2">Calculation Method:</p>
                  <p className="text-gray-300">Empty Code Ratio = (Empty Responses / Total Responses)</p>
                  <p className="text-gray-300">Score = 1.0 - Empty Code Ratio</p>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Rationale */}
          <div className="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Weight Rationale & Research Basis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-yellow-300 mb-3">Why These Specific Weights?</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="font-medium text-blue-400">Code Quality (40%) - Primary Success Factor</p>
                    <ul className="text-gray-300 text-xs mt-1 list-disc list-inside">
                      <li>Represents the core value proposition of LLM-generated tests</li>
                      <li>Poor quality code wastes developer time in debugging and fixing</li>
                      <li>Quality issues compound over time in maintenance</li>
                    </ul>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="font-medium text-green-400">Execution Success (30%) - Practical Effectiveness</p>
                    <ul className="text-gray-300 text-xs mt-1 list-disc list-inside">
                      <li>Tests must actually work to provide value</li>
                      <li>Failed tests can give false confidence or waste CI/CD resources</li>
                      <li>Real-world applicability is crucial for adoption</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-yellow-300 mb-3">Alternative Weight Configurations</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="font-medium text-purple-400">Development-focused (prioritizes speed)</p>
                    <div className="text-xs text-gray-300 mt-1">
                      <p>Code Quality: 35%, Execution: 25%, Speed: 30%, Reuse: 10%</p>
                    </div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="font-medium text-orange-400">Production-focused (prioritizes quality)</p>
                    <div className="text-xs text-gray-300 mt-1">
                      <p>Code Quality: 50%, Execution: 35%, Speed: 10%, Reuse: 5%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Analysis Details */}
          <div className="mb-8 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Code Quality Pattern Analysis</h2>
            <p className="text-gray-300 mb-4">
              The code quality scoring system analyzes generated Cypress test code for specific patterns and constructs. 
              Each pattern detected adds to the quality score:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-700 p-4 rounded">
                <h4 className="font-medium text-cyan-300 mb-2">Cypress API Commands</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• cy.* commands (+0.1 per unique pattern)</li>
                  <li>• visit() page navigation (+0.1)</li>
                  <li>• click() interactions (+0.1)</li>
                  <li>• type() text input (+0.1)</li>
                </ul>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <h4 className="font-medium text-cyan-300 mb-2">Test Structure</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• describe() blocks (+0.1)</li>
                  <li>• it() test cases (+0.1)</li>
                  <li>• beforeEach/afterEach hooks (+0.1)</li>
                  <li>• .spec file patterns (+0.1)</li>
                </ul>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <h4 className="font-medium text-cyan-300 mb-2">Quality Indicators</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• should() assertions (+0.1)</li>
                  <li>• getBySel() custom selectors (+0.1)</li>
                  <li>• Custom commands usage (+0.1)</li>
                  <li>• Proper test organization (+0.1)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 bg-gray-900 p-4 rounded">
              <h4 className="font-medium text-green-400 mb-2">Example High-Quality Code:</h4>
              <pre className="text-xs text-gray-300 overflow-x-auto">
{`describe('User Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });
  
  it('should login successfully with valid credentials', () => {
    cy.getBySel('username-input').type('user@example.com');
    cy.getBySel('password-input').type('password123');
    cy.getBySel('login-button').click();
    cy.url().should('include', '/dashboard');
    cy.getBySel('welcome-message').should('be.visible');
  });
});`}
              </pre>
            </div>
          </div>

          {/* Performance Categories */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4 text-red-400">Performance Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-red-300 mb-3">Speed Categories</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">⚡</span>
                    <div>
                      <span className="font-medium text-green-400">Very Fast (&lt; 15s):</span>
                      <span className="text-gray-300 ml-2">Immediate productivity, minimal wait time</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">🚀</span>
                    <div>
                      <span className="font-medium text-blue-400">Fast (15-20s):</span>
                      <span className="text-gray-300 ml-2">Good responsiveness, acceptable for iterative development</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">🐌</span>
                    <div>
                      <span className="font-medium text-yellow-400">Moderate (20-30s):</span>
                      <span className="text-gray-300 ml-2">Noticeable delay, may impact workflow</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">🐢</span>
                    <div>
                      <span className="font-medium text-red-400">Slow (&gt; 30s):</span>
                      <span className="text-gray-300 ml-2">Significant wait time, productivity impact</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-300 mb-3">Success Rate Categories</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">🟢</span>
                    <div>
                      <span className="font-medium text-green-400">Excellent (90-100%):</span>
                      <span className="text-gray-300 ml-2">Tests run reliably, find real issues</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">🟡</span>
                    <div>
                      <span className="font-medium text-yellow-400">Good (70-89%):</span>
                      <span className="text-gray-300 ml-2">Most tests pass, occasional environment issues</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">🟠</span>
                    <div>
                      <span className="font-medium text-orange-400">Fair (50-69%):</span>
                      <span className="text-gray-300 ml-2">Mixed results, some fundamental issues</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-gray-700 p-2 rounded">
                    <span className="text-lg mr-2">🔴</span>
                    <div>
                      <span className="font-medium text-red-400">Poor (0-49%):</span>
                      <span className="text-gray-300 ml-2">Tests frequently fail, major structural problems</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
