'use client';

import React, { useState, useEffect } from 'react';

interface LLMGenerationSummary {
  llm: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  averageGenerationTime: number;
  totalGenerationTime: number;
  totalFiles: number;
  filesGenerated: number;
  fileGenerationRate: number;
}

interface DetailedTest {
  llm: string;
  fileName: string;
  testName: string;
  generationTime: number; // in milliseconds
  generationTimeSeconds: number; // in seconds
  executionTime: number; // in milliseconds
  executionTimeSeconds: number; // in seconds
  status: string;
  filePath: string;
  passed: boolean;
  generated: boolean;
}

interface TestGenerationData {
  llmSummaries: LLMGenerationSummary[];
  detailedTests: DetailedTest[];
  totalLLMs: number;
  timestamp: string;
}

// Define component with explicit naming pattern
const TestGenerationTimingView: React.FC = () => {
  const [testGenerationData, setTestGenerationData] = useState<TestGenerationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<string>('');
  const [detailedTests, setDetailedTests] = useState<DetailedTest[]>([]);
  const [allDetailedTests, setAllDetailedTests] = useState<DetailedTest[]>([]);
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchTestGenerationData();
  }, []);

  useEffect(() => {
    if (testGenerationData?.llmSummaries && testGenerationData.llmSummaries.length > 0 && !selectedLLM) {
      setSelectedLLM(testGenerationData.llmSummaries[0].llm);
    }
  }, [testGenerationData, selectedLLM]);

  const fetchTestGenerationData = async () => {
    try {
      const response = await fetch('/api/test-generation');
      if (!response.ok) {
        throw new Error('Failed to fetch test generation data');
      }
      const data = await response.json();
      setTestGenerationData(data);
      
      // También obtener todos los datos detallados para las tablas de resumen
      await fetchAllDetailedTests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDetailedTests = async () => {
    try {
      const response = await fetch('/api/test-generation?details=true&all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch all detailed test data');
      }
      const data = await response.json();
      setAllDetailedTests(data.detailedTests || []);
    } catch (err) {
      console.error('Error fetching all detailed tests:', err);
      setAllDetailedTests([]);
    }
  };

  const fetchDetailedTests = async () => {
    if (!selectedLLM) return;
    
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/test-generation?details=true&llm=${encodeURIComponent(selectedLLM)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch detailed test data');
      }
      const data = await response.json();
      setDetailedTests(data.detailedTests || []);
    } catch (err) {
      console.error('Error fetching detailed tests:', err);
      setDetailedTests([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleShowDetailedTable = async () => {
    if (!showDetailedTable) {
      await fetchDetailedTests();
    }
    setShowDetailedTable(!showDetailedTable);
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-2 text-gray-300">Loading test generation data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4">
        <p className="text-red-200">Error: {error}</p>
      </div>
    );
  }

  if (!testGenerationData?.llmSummaries || testGenerationData.llmSummaries.length === 0) {
    return (
      <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
        <p className="text-yellow-200">No test generation data available</p>
      </div>
    );
  }

  const { llmSummaries } = testGenerationData;  // Sort LLMs by overall performance (file generation rate and generation speed)
  const sortedLLMs = [...llmSummaries].sort((a, b) => {
    // Primary sort: file generation rate (higher is better)
    const aRate = a.fileGenerationRate || 0;
    const bRate = b.fileGenerationRate || 0;
    if (Math.abs(aRate - bRate) > 1) {
      return bRate - aRate;
    }
    // Secondary sort: generation speed (lower time is better)
    return a.averageGenerationTime - b.averageGenerationTime;
  });

  return (
    <div className="space-y-6">      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Test Generation Timing & Results</h2>
          {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{llmSummaries.length}</div>
            <div className="text-sm text-gray-300">Total LLMs</div>
          </div>          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {llmSummaries.reduce((sum, llm) => sum + (llm.filesGenerated || 0), 0)}
            </div>
            <div className="text-sm text-gray-300">Files Generated (Target: 45)</div>
          </div>          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              {((llmSummaries.reduce((sum, llm) => sum + llm.filesGenerated, 0) / (llmSummaries.length * 45)) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-300">Overall File Generation Rate</div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-400">
              {(llmSummaries.reduce((sum, llm) => sum + llm.averageGenerationTime, 0) / llmSummaries.length / 1000).toFixed(1)}s
            </div>
            <div className="text-sm text-gray-300">Avg Generation Time</div>
          </div>
        </div>        {/* LLM Performance Summary Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">LLM</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Files Generated</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">File Generation Rate</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Generation Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Performance</th>
              </tr>            </thead>
            <tbody className="divide-y divide-gray-600">
              {sortedLLMs.map((llm, index) => (
                <tr key={llm.llm} className={`hover:bg-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                      index < 2 ? 'bg-green-500' : 
                      index < 4 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}>
                      {index + 1}
                    </span>
                  </td>                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">
                      {llm.llm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </td><td className="px-4 py-3 text-center">
                    <div className="text-sm font-semibold text-white">{(llm.filesGenerated || 0)}/45</div>
                    <div className="text-xs text-gray-400">files</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-semibold text-white">{(llm.fileGenerationRate || 0).toFixed(1)}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${
                          (llm.fileGenerationRate || 0) >= 90 ? 'bg-green-500' :
                          (llm.fileGenerationRate || 0) >= 75 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${llm.fileGenerationRate || 0}%` }}
                      ></div>                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-semibold text-white">
                      {(llm.averageGenerationTime / 1000).toFixed(2)}s
                    </div>
                    <div className="text-xs text-gray-400">
                      {llm.averageGenerationTime < 5000 ? 'Fast' : 
                       llm.averageGenerationTime < 10000 ? 'Moderate' : 'Slow'}
                    </div>
                  </td>                  <td className="px-4 py-3 text-center">
                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (llm.fileGenerationRate || 0) >= 90 && llm.averageGenerationTime < 10000 ? 'bg-green-900 text-green-200' :
                      (llm.fileGenerationRate || 0) >= 75 ? 'bg-yellow-900 text-yellow-200' :
                      'bg-red-900 text-red-200'
                    }`}>
                      {(llm.fileGenerationRate || 0) >= 90 && llm.averageGenerationTime < 10000 ? 'Excellent' :
                       (llm.fileGenerationRate || 0) >= 75 ? 'Good' : 'Poor'}
                    </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-300">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            <span>Top Performers (Rank 1-2)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
            <span>Good Performers (Rank 3-4)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            <span>Lower Performers (Rank 5+)</span>
          </div>          <div className="ml-auto text-gray-400">
            Ranked by pass rate, then by generation speed
          </div>
        </div>
      </div>      {/* Test File Summary Tables */}
      <TestFileSummaryTables testGenerationData={testGenerationData} />

      {/* Detailed Test Results Section */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Detailed Test Results</h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedLLM}
              onChange={(e) => {
                setSelectedLLM(e.target.value);
                setShowDetailedTable(false);
                setDetailedTests([]);
              }}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {llmSummaries.map(llm => (
                <option key={llm.llm} value={llm.llm} className="text-white bg-gray-700">
                  {llm.llm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            <button
              onClick={handleShowDetailedTable}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showDetailedTable ? 'Hide Details' : 'Show Detailed Results'}
            </button>
          </div>
        </div>

        {showDetailedTable && (
          <div className="space-y-4">            {loadingDetails ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="ml-2 text-gray-300">Loading detailed test data...</span>
              </div>
            ) : detailedTests.length > 0 ? (
              <>
                {/* Summary Statistics for Selected LLM */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">                  <div className="bg-gray-700 p-4 rounded-lg text-center border-l-4 border-blue-500">
                    <div className="text-2xl font-bold text-blue-400">{detailedTests.length}</div>
                    <div className="text-sm text-gray-300">Total Tests</div>
                  </div>                  <div className="bg-gray-700 p-4 rounded-lg text-center border-l-4 border-green-500">
                    <div className="text-2xl font-bold text-green-400">
                      {detailedTests.filter(t => t.generated).length}
                    </div>
                    <div className="text-sm text-gray-300">Generated Tests</div>
                  </div>                  <div className="bg-gray-700 p-4 rounded-lg text-center border-l-4 border-red-500">
                    <div className="text-2xl font-bold text-red-400">
                      {detailedTests.filter(t => !t.generated).length}
                    </div>
                    <div className="text-sm text-gray-300">Not Generated</div>
                  </div>                  <div className="bg-gray-700 p-4 rounded-lg text-center border-l-4 border-purple-500">
                    <div className="text-2xl font-bold text-purple-400">
                      {detailedTests.length > 0 ? (detailedTests.reduce((sum, t) => sum + t.generationTime, 0) / detailedTests.length / 1000).toFixed(1) : '0'}s
                    </div>
                    <div className="text-sm text-gray-300">Avg Generation Time</div>
                  </div>
                </div>                {/* Detailed Test Results Table */}
                <div className="overflow-x-auto">                  <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
                    <thead className="bg-gray-700">                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">File Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">It Block #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Test Name</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Generation Time</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Generation Status</th>
                      </tr></thead>
                    <tbody className="divide-y divide-gray-600">
                      {detailedTests.map((test, index) => {
                        // Extract file name base and it block number
                        // Handle cases like "auth1.spec.ts" -> "auth.spec.ts" as filename and "1" as block number
                        const fileNameParts = test.fileName.match(/(.+?)(\d+)(\..+)$/);
                        const fileNameBase = fileNameParts 
                          ? fileNameParts[1] + fileNameParts[3] 
                          : test.fileName;
                        const itBlockNum = fileNameParts ? fileNameParts[2] : '';
                          return (
                          <tr key={`${test.filePath}-${test.testName}-${index}`} className={`hover:bg-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}>                            <td className="px-4 py-3 text-sm text-gray-300">
                              <div className="max-w-xs truncate" title={fileNameBase}>
                                {fileNameBase}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-white">
                              {itBlockNum}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-white">
                              <div className="max-w-xs truncate" title={test.testName}>
                                {test.testName}
                              </div>
                            </td>                            <td className="px-4 py-3 text-sm text-gray-300">
                              <div className="flex items-center justify-center">
                                <span className="font-medium text-white">{(test.generationTime / 1000).toFixed(2)}s</span>
                                <div className="ml-2 w-16 bg-gray-600 rounded-full h-2">
                                  <div 
                                    className="h-2 bg-blue-500 rounded-full"
                                    style={{ 
                                      width: `${Math.min(100, (test.generationTime / Math.max(...detailedTests.map(t => t.generationTime))) * 100)}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </td>                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                test.generated 
                                  ? 'bg-green-900 text-green-200' 
                                  : 'bg-red-900 text-red-200'
                              }`}>
                                {test.generated ? 'Generated' : 'Not Generated'}
                              </span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (              <div className="text-center p-8 text-gray-400">
                No detailed test data available for {selectedLLM.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            )}
          </div>
        )}
      </div>
    </div>  );
};

// Helper component for Test File Summary Tables
interface TestFileSummaryTablesProps {
  testGenerationData: TestGenerationData | null;
}

const TestFileSummaryTables: React.FC<TestFileSummaryTablesProps> = ({ testGenerationData }) => {
  const [allDetailedTests, setAllDetailedTests] = useState<DetailedTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllDetailedTests();
  }, []);

  const fetchAllDetailedTests = async () => {
    try {
      const response = await fetch('/api/test-generation?details=true&all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch all detailed test data');
      }
      const data = await response.json();
      setAllDetailedTests(data.detailedTests || []);
    } catch (err) {
      console.error('Error fetching all detailed tests:', err);
      setAllDetailedTests([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="ml-2 text-gray-300">Loading test file summaries...</span>
        </div>
      </div>
    );
  }

  if (!allDetailedTests || allDetailedTests.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Test Generation Summary by File</h2>
        <div className="text-center p-8 text-gray-400">
          No detailed test data available for file summaries
        </div>
      </div>
    );
  }

  // Group tests by file base name (e.g., "auth1", "auth2" -> "auth")
  const fileGroups = new Map<string, DetailedTest[]>();
  
  allDetailedTests.forEach(test => {
    // Extract file base name (e.g., "auth1" -> "auth")
    const fileNameParts = test.fileName.match(/(.+?)(\d+)$/);
    const fileBase = fileNameParts ? fileNameParts[1] : test.fileName.replace(/\d+$/, '') || 'other';
    
    if (!fileGroups.has(fileBase)) {
      fileGroups.set(fileBase, []);
    }
    fileGroups.get(fileBase)!.push(test);
  });

  // Get unique LLMs
  const uniqueLLMs = [...new Set(allDetailedTests.map(test => test.llm))];

  const createTestFileTable = (fileBase: string, tests: DetailedTest[]) => {
    // Group tests by test number within the file
    const testsByNumber = new Map<string, Map<string, DetailedTest>>();
    
    tests.forEach(test => {
      const fileNameParts = test.fileName.match(/(.+?)(\d+)$/);
      const testNumber = fileNameParts ? fileNameParts[2] : '1';
      
      if (!testsByNumber.has(testNumber)) {
        testsByNumber.set(testNumber, new Map());
      }
      testsByNumber.get(testNumber)!.set(test.llm, test);
    });

    const sortedTestNumbers = Array.from(testsByNumber.keys()).sort((a, b) => parseInt(a) - parseInt(b));

    return (
      <div key={fileBase} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-4 capitalize">
          {fileBase.replace(/-/g, ' ')} Tests Summary
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Test
                </th>
                {uniqueLLMs.map(llm => (
                  <th key={llm} className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {llm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {sortedTestNumbers.map((testNumber, index) => {
                const testsForNumber = testsByNumber.get(testNumber)!;
                return (
                  <tr key={testNumber} className={`hover:bg-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      {fileBase} {testNumber}
                    </td>
                    {uniqueLLMs.map(llm => {
                      const test = testsForNumber.get(llm);
                      return (
                        <td key={llm} className="px-4 py-3 text-center">
                          {test ? (
                            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              test.generated ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'
                            }`}>
                              {test.generated ? (
                                <div>
                                  <div className="font-bold">{(test.generationTime / 1000).toFixed(1)}s</div>
                                  <div className="text-xs opacity-75">Generated</div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-bold">—</div>
                                  <div className="text-xs opacity-75">Failed</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 text-gray-300">
                              <div className="font-bold">—</div>
                              <div className="text-xs opacity-75">No Data</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Summary for this file */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-400">{sortedTestNumbers.length}</div>
            <div className="text-xs text-gray-300">Total Tests</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-green-400">
              {uniqueLLMs.reduce((sum, llm) => {
                return sum + sortedTestNumbers.filter(testNum => {
                  const test = testsByNumber.get(testNum)?.get(llm);
                  return test?.generated;
                }).length;
              }, 0)}
            </div>
            <div className="text-xs text-gray-300">Generated Across All LLMs</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-orange-400">
              {uniqueLLMs.length > 0 ? (
                uniqueLLMs.reduce((sum, llm) => {
                  const llmTests = sortedTestNumbers.map(testNum => testsByNumber.get(testNum)?.get(llm))
                    .filter(test => test?.generated);
                  const avgTime = llmTests.length > 0 
                    ? llmTests.reduce((s, t) => s + (t?.generationTime || 0), 0) / llmTests.length
                    : 0;
                  return sum + avgTime;
                }, 0) / uniqueLLMs.length / 1000
              ).toFixed(1) : '0'}s
            </div>
            <div className="text-xs text-gray-300">Avg Generation Time</div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-purple-400">
              {((uniqueLLMs.reduce((sum, llm) => {
                return sum + sortedTestNumbers.filter(testNum => {
                  const test = testsByNumber.get(testNum)?.get(llm);
                  return test?.generated;
                }).length;
              }, 0) / (sortedTestNumbers.length * uniqueLLMs.length)) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-300">Success Rate</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Test Generation Summary by File</h2>
        <p className="text-gray-300 mb-4">
          Overview of test generation results organized by test file. Each table shows the generation time and success status for each test across all LLMs.
        </p>
        
        {/* Legend */}
        <div className="mb-6 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-900 rounded mr-2"></div>
            <span className="text-green-200">Generated Successfully (shows time in seconds)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-900 rounded mr-2"></div>
            <span className="text-red-200">Generation Failed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-700 rounded mr-2"></div>
            <span className="text-gray-300">No Data Available</span>
          </div>
        </div>
      </div>
      
      {Array.from(fileGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fileBase, tests]) => createTestFileTable(fileBase, tests))}
    </div>
  );
};

// Export the component
export default TestGenerationTimingView;
