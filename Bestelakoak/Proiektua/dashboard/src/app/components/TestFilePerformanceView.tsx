"use client";
import React, { useState, useEffect } from "react";

interface TestExecution {
  testName: string;
  fileName: string;
  filePath: string;
  status: string;
  duration: number;
  llm: string;
}

interface TestFileGroup {
  fileName: string;
  tests: {
    testName: string;
    executions: {
      [llmName: string]: {
        status: string;
        duration: number;
        executed: boolean;
      };
    };
  }[];
}

interface ExtendedTest {
  testName: string;
  fileName: string;
  testDisplayName: string;
  executions: {
    [llmName: string]: {
      status: string;
      duration: number;
      executed: boolean;
    };
  };
}

interface LLMTestData {
  llm: string;
  displayName: string;
  tests: TestExecution[];
}

const TestFilePerformanceView: React.FC = () => {
  const [testFileGroups, setTestFileGroups] = useState<TestFileGroup[]>([]);
  const [allLLMs, setAllLLMs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  // LLM Display Names mapping
  const getLLMDisplayName = (llmName: string): string => {
    const displayNames: { [key: string]: string } = {
      'original': 'Original (Baseline)',
      'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
      'claude_3_7_sonnet': 'Claude 3.7 Sonnet',
      'claude_3_7_thinking': 'Claude 3.7 Thinking',
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
    return displayNames[llmName] || llmName;
  };

  // Normalize test name by removing dynamic execution suffixes
  const normalizeTestName = (testName: string): string => {
    return testName
      .replace(/\s*\(\d+\)$/, '')           // Remove (1), (2), etc.
      .replace(/\s*-\s*run\s*\d+$/i, '')    // Remove "- run 1", "- run 2", etc.
      .replace(/\s*#\d+$/, '')              // Remove "#1", "#2", etc.
      .trim();
  };

  // Extract clean file name from path
  const getCleanFileName = (filePath: string): string => {
    const fileName = filePath.split('\\').pop()?.split('/').pop() || filePath;
    return fileName.replace('.spec.ts', '').replace('.spec.js', '');
  };

  // Group tests by category based on file name
  const getTestCategory = (fileName: string): string => {
    const cleanName = getCleanFileName(fileName).toLowerCase();
    
    if (cleanName.includes('auth') || cleanName.includes('signin') || cleanName.includes('signup') || cleanName.includes('login')) {
      return 'Authentication';
    }
    if (cleanName.includes('bank') || cleanName.includes('account')) {
      return 'Banking';
    }
    if (cleanName.includes('transaction') || cleanName.includes('payment')) {
      return 'Transactions';
    }
    if (cleanName.includes('user') || cleanName.includes('profile') || cleanName.includes('settings')) {
      return 'User Management';
    }
    if (cleanName.includes('notification')) {
      return 'Notifications';
    }
    if (cleanName.includes('ui') || cleanName.includes('navigation') || cleanName.includes('layout')) {
      return 'UI/Navigation';
    }
    
    return 'Other';
  };

  // Get background color based on test status
  const getStatusColor = (status: string, executed: boolean): string => {
    if (!executed) {
      return 'bg-gray-100 text-gray-500'; // Not executed
    }
    
    switch (status?.toLowerCase()) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  // Format duration in milliseconds to readable format
  const formatDuration = (duration: number): string => {
    if (duration === 0 || !duration) return '-';
    
    if (duration < 1000) {
      return `${Math.round(duration)}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch test execution results from the new simplified collections
        const response = await fetch('/api/mongo/action-usage-analysis?type=test-details');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
          const data = await response.json();
        console.log('📊 Fetched test data:', data);
        console.log('📊 Test data structure:', JSON.stringify(data, null, 2));

        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.log('⚠️ No test data available');
          setError('No test data available');
          return;
        }

        // Process the data to group by test files
        const testsByFile = new Map<string, Map<string, { [llmName: string]: { status: string; duration: number; executed: boolean } }>>();
        const llmSet = new Set<string>();

        // Handle both single LLM and multiple LLM responses
        const testDataArray = Array.isArray(data) ? data : [data];
        console.log('📊 Processing test data array length:', testDataArray.length);

        testDataArray.forEach((llmData, index) => {
          console.log(`📊 Processing LLM data ${index}:`, {
            target: llmData.target,
            testsCount: llmData.testComparison?.tests?.length || 0
          });
          
          if (!llmData.testComparison?.tests) {
            console.log(`⚠️ No test comparison data for LLM: ${llmData.target}`);
            return;
          }

          const llmName = llmData.target;
          llmSet.add(llmName);          llmData.testComparison.tests.forEach((test: any, testIndex: number) => {
            const fileName = getCleanFileName(test.filename || test.filePath || '');
            const originalTestName = test.testName || 'Unknown Test';
            const normalizedTestName = normalizeTestName(originalTestName);
            
            console.log(`📊 Processing test ${testIndex} for ${llmName}:`, {
              fileName,
              originalTestName,
              normalizedTestName,
              originalFileName: test.filename || test.filePath,
              hasBaseline: !!test.baseline,
              hasTarget: !!test.target
            });

            if (!testsByFile.has(fileName)) {
              testsByFile.set(fileName, new Map());
            }

            const fileTests = testsByFile.get(fileName)!;
            if (!fileTests.has(normalizedTestName)) {
              fileTests.set(normalizedTestName, {});
            }

            const testExecutions = fileTests.get(normalizedTestName)!;
            
            // Add baseline data (only if it doesn't exist to avoid overwriting)
            if (test.baseline && !testExecutions['original']) {
              testExecutions['original'] = {
                status: test.baseline.status || 'unknown',
                duration: test.baseline.duration || 0,
                executed: true
              };
              llmSet.add('original');
            }

            // Add target LLM data (only if it doesn't exist or if it's better data)
            if (test.target && (!testExecutions[llmName] || !testExecutions[llmName].executed)) {
              testExecutions[llmName] = {
                status: test.target.status || 'not executed',
                duration: test.target.duration || 0,
                executed: test.target.executed || false
              };
            }
          });
        });

        // Convert to array format for rendering
        const fileGroups: TestFileGroup[] = Array.from(testsByFile.entries()).map(([fileName, testsMap]) => ({
          fileName,
          tests: Array.from(testsMap.entries()).map(([testName, executions]) => ({
            testName,
            executions
          }))
        }));

        // Sort file groups by category and name
        fileGroups.sort((a, b) => {
          const categoryA = getTestCategory(a.fileName);
          const categoryB = getTestCategory(b.fileName);
          
          if (categoryA !== categoryB) {
            return categoryA.localeCompare(categoryB);
          }
          
          return a.fileName.localeCompare(b.fileName);
        });

        // Sort LLMs: original first, then alphabetically
        const sortedLLMs = Array.from(llmSet).sort((a, b) => {
          if (a === 'original') return -1;
          if (b === 'original') return 1;
          return a.localeCompare(b);
        });        setTestFileGroups(fileGroups);
        setAllLLMs(sortedLLMs);
        
        // Initially show all files
        setSelectedFiles(new Set(fileGroups.map(fg => fg.fileName)));

        console.log('✅ Processed test data after normalization:', {
          fileGroups: fileGroups.length,
          llms: sortedLLMs.length,
          totalUniqueTests: fileGroups.reduce((sum, fg) => sum + fg.tests.length, 0)
        });
        
        // Log detailed breakdown        console.log('📊 Final file breakdown:');
        fileGroups.forEach(fg => {
          console.log(`📂 ${fg.fileName}: ${fg.tests.length} tests`);
          if (fg.tests.length > 0) {
            console.log(`   Sample: ${fg.tests.slice(0, 3).map(t => t.testName).join(', ')}`);
          }
        });

      } catch (err) {
        console.error('❌ Error fetching test data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, []);

  // Toggle file selection
  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName);
    } else {
      newSelection.add(fileName);
    }
    setSelectedFiles(newSelection);
  };

  // Toggle all files in a category
  const toggleCategory = (category: string) => {
    const categoryFiles = testFileGroups
      .filter(fg => getTestCategory(fg.fileName) === category)
      .map(fg => fg.fileName);
    
    const allSelected = categoryFiles.every(fileName => selectedFiles.has(fileName));
    const newSelection = new Set(selectedFiles);
    
    categoryFiles.forEach(fileName => {
      if (allSelected) {
        newSelection.delete(fileName);
      } else {
        newSelection.add(fileName);
      }
    });
    
    setSelectedFiles(newSelection);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error Loading Test Data</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Group files by category for display
  const filesByCategory = testFileGroups.reduce((acc, fileGroup) => {
    const category = getTestCategory(fileGroup.fileName);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(fileGroup);
    return acc;
  }, {} as { [category: string]: TestFileGroup[] });

  const categories = Object.keys(filesByCategory).sort();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🧪 Test Performance by File
        </h2>
        <p className="text-gray-600 mb-6">
          Execution times for each test across different LLMs. 
          <span className="inline-block ml-2">
            <span className="inline-block w-3 h-3 bg-green-100 border border-green-200 rounded mr-1"></span>Passed
            <span className="inline-block w-3 h-3 bg-red-100 border border-red-200 rounded mr-1 ml-3"></span>Failed
            <span className="inline-block w-3 h-3 bg-gray-100 border border-gray-200 rounded mr-1 ml-3"></span>Not Executed
          </span>
        </p>

        {/* Category Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Filter by Category:</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => {
              const categoryFiles = filesByCategory[category].map(fg => fg.fileName);
              const allSelected = categoryFiles.every(fileName => selectedFiles.has(fileName));
              const someSelected = categoryFiles.some(fileName => selectedFiles.has(fileName));
              
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    allSelected
                      ? 'bg-blue-500 text-white'
                      : someSelected
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                  }`}
                >
                  {category} ({categoryFiles.length})
                </button>
              );
            })}
          </div>
        </div>        {/* Test Tables by Category */}
        {categories.map(category => {
          const categoryFileGroups = filesByCategory[category].filter(fg => 
            selectedFiles.has(fg.fileName)
          );

          if (categoryFileGroups.length === 0) return null;          // Combine all tests from all files in this category into one table
          const allCategoryTests: ExtendedTest[] = categoryFileGroups.reduce((allTests: ExtendedTest[], fileGroup) => {
            const testsWithFileName = fileGroup.tests.map(test => ({
              ...test,
              fileName: fileGroup.fileName,
              testDisplayName: `${getCleanFileName(fileGroup.fileName)} - ${test.testName}`
            }));
            return [...allTests, ...testsWithFileName];
          }, []);

          return (
            <div key={category} className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                📁 {category} ({allCategoryTests.length} tests from {categoryFileGroups.length} files)
              </h3>
                <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 border-b">
                        Test Name
                      </th>
                      {allLLMs.map(llmName => (
                        <th key={llmName} className="px-1 py-2 text-center text-xs font-medium text-gray-700 border-b min-w-[80px]">
                          <div className="text-xs leading-tight">
                            {getLLMDisplayName(llmName)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allCategoryTests.map((test: ExtendedTest, testIndex: number) => (
                      <tr key={`${category}-${test.fileName}-${test.testName}-${testIndex}`} 
                          className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs text-gray-800 border-b font-medium max-w-[200px]">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs leading-tight">{test.testName}</span>
                            <span className="text-[10px] text-gray-500 leading-tight">{test.fileName}</span>
                          </div>
                        </td>
                        {allLLMs.map(llmName => {
                          const execution = test.executions[llmName];
                          const hasExecution = execution && execution.executed;
                          const colorClass = getStatusColor(
                            execution?.status || 'not executed', 
                            hasExecution
                          );
                          
                          return (
                            <td key={`${test.testName}-${llmName}`} 
                                className={`px-1 py-2 text-center text-xs border-b border ${colorClass}`}>
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-xs leading-tight">
                                  {hasExecution ? formatDuration(execution.duration) : '-'}
                                </span>
                                <span className="text-[10px] opacity-75 leading-tight">
                                  {execution?.status || 'not executed'}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {testFileGroups.filter(fg => selectedFiles.has(fg.fileName)).length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>No test files selected. Please select categories or files to view.</p>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Summary Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {testFileGroups.filter(fg => selectedFiles.has(fg.fileName)).length}
            </div>
            <div className="text-sm text-blue-700">Test Files</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {testFileGroups
                .filter(fg => selectedFiles.has(fg.fileName))
                .reduce((sum, fg) => sum + fg.tests.length, 0)}
            </div>
            <div className="text-sm text-green-700">Total Tests</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {allLLMs.length}
            </div>
            <div className="text-sm text-purple-700">LLMs</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {categories.length}
            </div>
            <div className="text-sm text-amber-700">Categories</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
              {Math.round(
                testFileGroups
                  .filter(fg => selectedFiles.has(fg.fileName))
                  .reduce((sum, fg) => sum + fg.tests.length, 0) * allLLMs.length
              )}
            </div>
            <div className="text-sm text-indigo-700">Total Executions</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestFilePerformanceView;
