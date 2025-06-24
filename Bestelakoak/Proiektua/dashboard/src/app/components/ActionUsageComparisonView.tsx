'use client';

import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Helper to get code for Claude 3.5 Sonnet from local JSON (si no hay match, mostrar feedback detallado)
async function getClaude35Code(filePath: string): Promise<string> {
  if (!filePath) return 'No file path provided.';
  try {
    const response = await fetch('/data/processed_prompt_results/matched_data_claude_3_5_sonnet.json');
    const matchedDataClaude35 = await response.json();
    const getBase = (p: string) => p.split('\\').pop()?.split('/').pop()?.toLowerCase() || p.toLowerCase();
    const filePathBase = getBase(filePath);
    const allBases = matchedDataClaude35.map((item: any) => getBase(item.output_file || ''));
    const match = matchedDataClaude35.find((item: any) => getBase(item.output_file || '') === filePathBase);
    if (!match) {
      // Mostrar feedback detallado en vez de solo 'No code found'
      return (
        `No code found for this test file.\n` +
        `Searched for: ${filePathBase}\n` +
        `Available files: ${allBases.slice(0, 10).join(', ')}${allBases.length > 10 ? ', ...' : ''}`
      );
    }
    return match?.code || 'No code found for this test file.';
  } catch (e) {
    return 'Error loading code.';
  }
}


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

// New interfaces for test details
interface TestDetails {
  id?: string;
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

// Interfaces for Test File Performance
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

// Helper functions for Test File Performance
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

const normalizeTestName = (testName: string): string => {
  return testName
    .replace(/\s*\(\d+\)$/, '')           // Remove (1), (2), etc.
    .replace(/\s*-\s*run\s*\d+$/i, '')    // Remove "- run 1", "- run 2", etc.
    .replace(/\s*#\d+$/, '')              // Remove "#1", "#2", etc.
    .trim();
};

const getCleanFileName = (filePath: string): string => {
  const fileName = filePath.split('\\').pop()?.split('/').pop() || filePath;
  return fileName.replace('.spec.ts', '').replace('.spec.js', '');
};

const getFilePrefix = (fileName: string): string => {
  const cleanName = getCleanFileName(fileName).toLowerCase();
  
  // Remove numbers and common suffixes to get the base name
  const baseName = cleanName
    .replace(/\d+$/, '')           // Remove trailing numbers (auth1 -> auth)
    .replace(/-\d+$/, '')          // Remove trailing -numbers (auth-1 -> auth)
    .replace(/_\d+$/, '')          // Remove trailing _numbers (auth_1 -> auth)
    .replace(/\.$/, '');           // Remove trailing dots
  
  // Return the base name capitalized - this will group exact matches
  // auth1, auth2, auth3 -> "Auth"
  // new-transaction1, new-transaction2 -> "New-transaction" 
  // transaction-feed1, transaction-feed2 -> "Transaction-feed"
  // bankaccounts1, bankaccounts2 -> "Bankaccounts"
  return baseName.charAt(0).toUpperCase() + baseName.slice(1);
};

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

const getStatusColor = (status: string, executed: boolean): string => {
  if (!executed) {
    return 'bg-gray-600 text-gray-300'; // Not executed - dark theme
  }
  switch (status?.toLowerCase()) {
    case 'passed':
      return 'bg-green-300 text-green-900 border-green-200'; // Verde suave
    case 'failed':
    case 'skipped': // Treat skipped as failed
      return 'bg-red-300 text-red-900 border-red-200'; // Rojo suave
    default:
      return 'bg-yellow-200 text-yellow-900 border-yellow-300'; // Amarillo suave
  }
};

const getDisplayStatus = (status: string): string => {
  // Display "skipped" as "failed" in the UI
  return status?.toLowerCase() === 'skipped' ? 'failed' : status;
};

const formatDuration = (duration: number): string => {
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};

// Helper function to count and format command frequencies
const formatCommandFrequency = (commands: any): string => {
  // Check if commands is null, undefined, or not an object
  if (!commands || typeof commands !== 'object') {
    return 'No commands';
  }
  
  // Convert object to array of [command, count] pairs
  const commandEntries = Object.entries(commands).filter(([cmd, count]) => {
    // Only include valid entries where cmd is a string and count is a number > 0
    return cmd && typeof cmd === 'string' && typeof count === 'number' && count > 0;
  });
  
  // If no valid commands found
  if (commandEntries.length === 0) {
    return 'No valid commands';
  }
  
  // Sort by frequency (descending) and format
  const sortedCommands = commandEntries
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([cmd, count]) => (count as number) > 1 ? `${cmd} (${count})` : cmd);
  
  // Limit to top 3 commands to keep the cell readable
  if (sortedCommands.length > 3) {
    return sortedCommands.slice(0, 3).join(', ') + `... (+${sortedCommands.length - 3} more)`;
  }
  
  return sortedCommands.join(', ');
};

const ActionUsageComparisonView: React.FC = () => {
  const [actionSummary, setActionSummary] = useState<ActionSummary | null>(null);
  const [actionAnalyses, setActionAnalyses] = useState<ActionAnalysis[]>([]);
  const [testDetails, setTestDetails] = useState<TestDetailsComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<string>('');
  const [selectedView, setSelectedView] = useState<'summary' | 'detailed'>('summary');
  const [availableLLMs, setAvailableLLMs] = useState<Array<{key: string, displayName: string}>>([]);
  
  // Test File Performance state
  const [testFileGroups, setTestFileGroups] = useState<TestFileGroup[]>([]);
  const [allLLMs, setAllLLMs] = useState<string[]>([]);
  const [testFileLoading, setTestFileLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Add state for code viewing
  const [codeModal, setCodeModal] = useState<
  | { filePath: string; code: string }
  | { filePath: string; baselineCode: string; llmCode: string; llmName: string }
  | null
>(null);
  // Nuevo helper para obtener el LLM desde el contexto de test o del estado seleccionado
  function getLlmForTest(test: any, selectedLLM: string) {
    // Si el test tiene un campo llm, úsalo; si no, usa el seleccionado
    return test.llm || selectedLLM;
  }

  // Modificar fetchTestFileCode para obtener baseline y generado
  const fetchTestFileCode = async (fileName: string, llmKey?: string) => {
    const llm = llmKey || selectedLLM;
    if (!llm || !fileName) {
      setCodeModal({ filePath: fileName, code: 'LLM o nombre de archivo no especificado.' });
      return;
    }
    try {
      const baselineRes = await fetch(`/api/test-files?llm=original&filename=${encodeURIComponent(fileName)}`);
      const baselineData = baselineRes.ok ? await baselineRes.json() : { code: 'No baseline code found.' };
      const llmRes = await fetch(`/api/test-files?llm=${encodeURIComponent(llm)}&filename=${encodeURIComponent(fileName)}`);
      const llmData = llmRes.ok ? await llmRes.json() : { code: 'No generated code found.' };
      setCodeModal({
        filePath: fileName,
        baselineCode: baselineData.code || 'No baseline code found.',
        llmCode: llmData.code || 'No generated code found.',
        llmName: llm
      });
    } catch (err) {
      setCodeModal({ filePath: fileName, code: 'Error al cargar el código.' });
    }
  };

  useEffect(() => {
    fetchActionUsageData();
    fetchTestFileData();
  }, []);

  const fetchTestFileData = async () => {
    try {
      setTestFileLoading(true);
      
      // Fetch test execution results from the new simplified collections
      const response = await fetch('/api/mongo/action-usage-analysis?type=test-details');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Fetched test file data:', data);

      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('⚠️ No test file data available');
        return;
      }

      // Process the data to group by test files
      const testsByFile = new Map<string, Map<string, { [llmName: string]: { status: string; duration: number; executed: boolean } }>>();
      const llmSet = new Set<string>();

      // Handle both single LLM and multiple LLM responses
      const testDataArray = Array.isArray(data) ? data : [data];

      testDataArray.forEach((llmData) => {
        if (!llmData.testComparison?.tests) {
          console.log(`⚠️ No test comparison data for LLM: ${llmData.target}`);
          return;
        }

        const llmName = llmData.target;
        llmSet.add(llmName);

        llmData.testComparison.tests.forEach((test: any) => {
          const fileName = getCleanFileName(test.filename || test.filePath || '');
          const originalTestName = test.testName || 'Unknown Test';
          const normalizedTestName = normalizeTestName(originalTestName);

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
          }          // Add target LLM data 
          if (test.target) {
            const targetStatus = test.target.status || 'not executed';
            // Consider a test executed if it has a valid status or if executed is explicitly true
            const targetExecuted = test.target.executed === true || (targetStatus && targetStatus !== 'not executed');
            
            // Always update with the latest data, especially if it has better execution info
            if (!testExecutions[llmName] || 
                !testExecutions[llmName].executed || 
                (targetExecuted && !testExecutions[llmName].executed)) {
              testExecutions[llmName] = {
                status: targetStatus,
                duration: test.target.duration || 0,
                executed: targetExecuted
              };
            }
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
      })).sort((a, b) => {
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
      });

      setTestFileGroups(fileGroups);
      setAllLLMs(sortedLLMs);
      
      // Initially show all files
      setSelectedFiles(new Set(fileGroups.map(fg => fg.fileName)));

      console.log('✅ Processed test file data:', {
        fileGroups: fileGroups.length,
        llms: sortedLLMs.length,
        totalUniqueTests: fileGroups.reduce((sum, fg) => sum + fg.tests.length, 0)
      });

    } catch (err) {
      console.error('❌ Error fetching test file data:', err);
    } finally {
      setTestFileLoading(false);
    }
  };

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
      setActionSummary(summaryData);      // Fetch all action analyses
      const analysesResponse = await fetch('/api/mongo/action-usage-analysis?type=analysis&latest=true');
      if (!analysesResponse.ok) {
        throw new Error('Failed to fetch action analyses');
      }
      const analysesData = await analysesResponse.json();
      setActionAnalyses(Array.isArray(analysesData) ? analysesData : []);

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
      setAvailableLLMs(Array.isArray(llmListData) ? llmListData : []);      console.log('✅ Action Usage Analysis data loaded successfully');
      console.log('Summary:', summaryData);
      console.log('Analyses:', analysesData?.length || 0, 'items');
      console.log('Test Details:', testDetailsData?.length || 0, 'items');
      console.log('Available LLMs:', llmListData?.length || 0, 'items');
      
      // Detailed logging for test details
      if (testDetailsData && testDetailsData.length > 0) {
        console.log('📊 First test detail:', testDetailsData[0]);
        console.log('📊 Test comparison structure:', testDetailsData[0]?.testComparison);
        console.log('📊 Tests array:', testDetailsData[0]?.testComparison?.tests?.length || 0, 'tests');
      }

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

    // Add safety checks for required properties
    if (!actionSummary.llmAnalyses || !Array.isArray(actionSummary.llmAnalyses)) {
      return (
        <div className="text-center py-8 text-gray-300">
          <div>Summary data incomplete</div>
          <div className="text-sm text-gray-400 mt-2">Missing LLM analyses data</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-300 mb-2">Action Usage Analysis Summary</h2>
          <p className="text-blue-200">
            Analysis of {actionSummary.totalLLMs || 0} LLMs compared to baseline: {actionSummary.baseline || 'unknown'}
          </p>
          <p className="text-sm text-blue-300 mt-1">
            Last updated: {actionSummary.timestamp ? new Date(actionSummary.timestamp).toLocaleString() : 'Unknown'}
          </p>
        </div>

        {/* LLM Performance Comparison Table - Now at the Top */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">LLM Performance Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">              <thead>
                <tr className="bg-gray-700">
                  <th className="px-3 py-2 text-left text-gray-200 font-semibold text-sm">LLM</th>
                  <th className="px-3 py-2 text-center text-gray-200 font-semibold text-sm">Executed Tests</th>
                  <th className="px-3 py-2 text-center text-gray-200 font-semibold text-sm">Executed Percentage</th>
                  <th className="px-3 py-2 text-center text-gray-200 font-semibold text-sm">Passed Tests</th>
                  <th className="px-3 py-2 text-center text-gray-200 font-semibold text-sm">Passed Percentage</th>
                </tr>
              </thead>
              <tbody>{(() => {
                  // Find the original (baseline) LLM data to get total tests
                  const originalLLM = actionSummary.llmAnalyses?.find(llm => llm?.llm === 'original');
                  const totalTestsFromOriginal = originalLLM ? originalLLM.totalTests : actionSummary.llmAnalyses?.[0]?.totalTests || 0;

                  // Calculate overall performance scores for sorting
                  const llmsWithPerformance = (actionSummary.llmAnalyses || [])
                    .filter((llm): llm is NonNullable<typeof llm> => Boolean(llm)) // Type guard
                    .map(llm => {
                      const executionRate = totalTestsFromOriginal > 0 ? (llm.totalTests / totalTestsFromOriginal) * 100 : 0;
                      const passRate = totalTestsFromOriginal > 0 ? (llm.passed / totalTestsFromOriginal) * 100 : 0; // Pass rate based on baseline total tests
                      
                      // Overall performance: 60% execution rate + 40% pass rate of baseline tests
                      // This gives more weight to actually executing tests, then passing the ones relative to baseline
                      const overallScore = (executionRate * 0.6) + (passRate * 0.4);
                      
                      return { 
                        ...llm, 
                        overallScore: overallScore || 0, 
                        executionRate: executionRate || 0, 
                        passRate: passRate || 0 
                      };
                    });

                  return llmsWithPerformance
                    .sort((a, b) => b.overallScore - a.overallScore) // Sort by overall performance (highest first)
                    .map((llm, index) => (                      <tr key={llm.llm} className={`hover:bg-gray-600 ${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                        <td className="px-3 py-2 font-medium text-white">
                          {llm.displayName}
                          {llm.llm === 'original' && <span className="ml-2 text-xs text-blue-300">(Baseline)</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="text-white font-semibold text-sm">
                            {llm.totalTests}/{totalTestsFromOriginal}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className={`text-base font-bold ${
                            llm.executionRate >= 90 ? 'text-green-400' :
                            llm.executionRate >= 70 ? 'text-yellow-400' :
                            llm.executionRate >= 50 ? 'text-orange-400' : 'text-red-400'
                          }`}>
                            {llm.executionRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">
                            Execution Rate
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="text-white font-semibold text-sm">{llm.passed}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className={`text-base font-bold ${
                            llm.passRate >= 90 ? 'text-green-400' :
                            llm.passRate >= 70 ? 'text-yellow-400' :
                            llm.passRate >= 50 ? 'text-orange-400' : 'text-red-400'
                          }`}>
                            {llm.passRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">
                            Pass Rate
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
            </div>          </div>
        </div>

        {/* Test File Performance Analysis */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-white">Test File Performance Analysis</h3>
          <p className="text-gray-300 mb-6">
            Execution times for each test across different LLMs, grouped by test category.
            <span className="inline-block ml-2">
              <span className="inline-block w-3 h-3 bg-green-600 border border-green-500 rounded mr-1"></span>Passed
              <span className="inline-block w-3 h-3 bg-red-600 border border-red-500 rounded mr-1 ml-3"></span>Failed
              <span className="inline-block w-3 h-3 bg-gray-600 border border-gray-500 rounded mr-1 ml-3"></span>Not Executed
            </span>
          </p>

          {testFileLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <p className="text-gray-300 mt-2">Loading test file performance data...</p>
            </div>
          ) : testFileGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No test file performance data available</p>
            </div>
          ) : (
            <>              {/* File Selection by Prefix */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-200">Filter by Test File Group:</h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // Group files by prefix
                    const filesByPrefix = testFileGroups.reduce((acc, fileGroup) => {
                      const prefix = getFilePrefix(fileGroup.fileName);
                      if (!acc[prefix]) {
                        acc[prefix] = [];
                      }
                      acc[prefix].push(fileGroup);
                      return acc;
                    }, {} as { [prefix: string]: TestFileGroup[] });
                    
                    const prefixes = Object.keys(filesByPrefix).sort();
                    
                    return prefixes.map(prefix => {
                      const prefixFiles = filesByPrefix[prefix].map(fg => fg.fileName);
                      const allSelected = prefixFiles.every(fileName => selectedFiles.has(fileName));
                      const someSelected = prefixFiles.some(fileName => selectedFiles.has(fileName));
                      const totalTests = filesByPrefix[prefix].reduce((sum, fg) => sum + fg.tests.length, 0);
                      
                      return (
                        <button
                          key={prefix}
                          onClick={() => {
                            const newSelection = new Set(selectedFiles);
                            prefixFiles.forEach(fileName => {
                              if (allSelected) {
                                newSelection.delete(fileName);
                              } else {
                                newSelection.add(fileName);
                              }
                            });
                            setSelectedFiles(newSelection);
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            allSelected
                              ? 'bg-blue-600 text-white border border-blue-500'
                              : someSelected
                              ? 'bg-blue-600/30 text-blue-300 border border-blue-600'
                              : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                          }`}
                        >
                          {prefix} ({prefixFiles.length} files, {totalTests} tests)
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>              {/* Test Tables by Prefix Group */}
              {(() => {
                // Group files by prefix
                const filesByPrefix = testFileGroups.reduce((acc, fileGroup) => {
                  const prefix = getFilePrefix(fileGroup.fileName);
                  if (!acc[prefix]) {
                    acc[prefix] = [];
                  }
                  acc[prefix].push(fileGroup);
                  return acc;
                }, {} as { [prefix: string]: TestFileGroup[] });

                const prefixes = Object.keys(filesByPrefix).sort();

                return prefixes.map(prefix => {
                  const prefixFileGroups = filesByPrefix[prefix].filter(fg => 
                    selectedFiles.has(fg.fileName)
                  );

                  if (prefixFileGroups.length === 0) return null;

                  // Combine all tests from all files in this prefix group
                  const allPrefixTests: ExtendedTest[] = prefixFileGroups.reduce((allTests: ExtendedTest[], fileGroup) => {
                    const testsWithFileName = fileGroup.tests.map(test => ({
                      ...test,
                      fileName: fileGroup.fileName,
                      testDisplayName: `${getCleanFileName(fileGroup.fileName)} - ${test.testName}`
                    }));
                    return [...allTests, ...testsWithFileName];
                  }, []);

                  return (
                    <div key={prefix} className="mb-8">
                      <h4 className="text-lg font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">
                        � {prefix} Group ({allPrefixTests.length} tests from {prefixFileGroups.length} files)
                        <div className="text-sm text-gray-400 mt-1">
                          Files: {prefixFileGroups.map(fg => fg.fileName).join(', ')}
                        </div>
                      </h4>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-600 rounded-lg text-sm bg-gray-800">
                          <thead className="bg-gray-700">
                            <tr>
                              <th className="px-2 py-2 text-left text-xs font-medium text-gray-200 border-b border-gray-600">
                                Test Name
                              </th>
                              {allLLMs.map(llmName => (
                                <th key={llmName} className="px-1 py-2 text-center text-xs font-medium text-gray-200 border-b border-gray-600 min-w-[80px]">
                                  <div className="text-xs leading-tight">
                                    {getLLMDisplayName(llmName)}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {allPrefixTests.map((test: ExtendedTest, testIndex: number) => (
                              <tr key={`${prefix}-${test.fileName}-${test.testName}-${testIndex}`} 
                                  className="hover:bg-gray-700 border-b border-gray-700">
                                <td className="px-2 py-2 text-xs text-gray-200 border-b border-gray-700 font-medium max-w-[200px]">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-xs leading-tight text-white">{test.testName}</span>
                                    <span className="text-[10px] text-gray-400 leading-tight">{test.fileName}</span>
                                  </div>
                                </td>                                {allLLMs.map(llmName => {
                                  const execution = test.executions[llmName];                                  // A test is considered executed if:
                                  // 1. execution.executed is explicitly true, OR
                                  // 2. execution has a valid status (passed, failed, skipped, etc.)
                                  const hasExecution = execution && (execution.executed === true || (execution.status && execution.status !== 'not executed'));
                                  const colorClass = getStatusColor(
                                    execution?.status || 'not executed', 
                                    Boolean(hasExecution)
                                  );
                                  
                                  return (
                                    <td key={`${test.testName}-${llmName}`} 
                                        className={`px-1 py-2 text-center text-xs border-b border-gray-700 ${colorClass}`}>
                                      <div className="flex flex-col items-center">
                                        <span className="font-medium text-xs leading-tight">
                                          {hasExecution ? formatDuration(execution.duration) : '-'}
                                        </span>
                                        <span className="text-[10px] opacity-75 leading-tight">
                                          {hasExecution && execution?.status ? getDisplayStatus(execution.status) : 'not executed'}
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
                });
              })()}

              {testFileGroups.filter(fg => selectedFiles.has(fg.fileName)).length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>No test file groups selected. Please select groups to view.</p>
                </div>
              )}              {/* Summary Statistics */}
              <div className="mt-8 bg-gray-700 border border-gray-600 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-200 mb-4">📊 Summary Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-blue-600/20 border border-blue-600 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-300">
                      {(() => {
                        const filesByPrefix = testFileGroups.reduce((acc, fileGroup) => {
                          const prefix = getFilePrefix(fileGroup.fileName);
                          if (!acc[prefix]) {
                            acc[prefix] = [];
                          }
                          acc[prefix].push(fileGroup);
                          return acc;
                        }, {} as { [prefix: string]: TestFileGroup[] });
                        return Object.keys(filesByPrefix).length;
                      })()}
                    </div>
                    <div className="text-sm text-blue-200">File Groups</div>
                  </div>
                  <div className="bg-green-600/20 border border-green-600 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-300">
                      {testFileGroups.filter(fg => selectedFiles.has(fg.fileName)).length}
                    </div>
                    <div className="text-sm text-green-200">Selected Files</div>
                  </div>
                  <div className="bg-purple-600/20 border border-purple-600 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-300">
                      {testFileGroups
                        .filter(fg => selectedFiles.has(fg.fileName))
                        .reduce((sum, fg) => sum + fg.tests.length, 0)}
                    </div>
                    <div className="text-sm text-purple-200">Total Tests</div>
                  </div>
                  <div className="bg-amber-600/20 border border-amber-600 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-amber-300">
                      {allLLMs.length}
                    </div>
                    <div className="text-sm text-amber-200">LLMs</div>
                  </div>
                  <div className="bg-indigo-600/20 border border-indigo-600 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-300">
                      {Math.round(
                        testFileGroups
                          .filter(fg => selectedFiles.has(fg.fileName))
                          .reduce((sum, fg) => sum + fg.tests.length, 0) * allLLMs.length
                      )}
                    </div>
                    <div className="text-sm text-indigo-200">Total Executions</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };
  const renderDetailedView = () => {
    const selectedAnalysis = actionAnalyses.find(a => a.llm === selectedLLM);
    const selectedTestDetails = testDetails.find(td => td.target === selectedLLM);
    
    console.log(`🔍 Rendering detailed view for LLM: ${selectedLLM}`);
    console.log(`📊 Selected analysis found:`, !!selectedAnalysis);
    console.log(`📊 Selected test details found:`, !!selectedTestDetails);
    console.log(`📊 Available test details targets:`, testDetails.map(td => td.target));
    console.log(`📊 Selected test details:`, selectedTestDetails);
    
    if (!selectedAnalysis) {
      return <div className="text-center py-8 text-gray-300">Select an LLM to view detailed analysis</div>;
    }return (
      <div className="space-y-6">
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
              <table className="min-w-full">                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-2 py-1 text-left text-xs font-semibold text-gray-200">Test Name</th>
                    <th className="px-2 py-1 text-center text-xs font-semibold text-gray-200">Baseline Status</th>
                    <th className="px-2 py-1 text-center text-xs font-semibold text-gray-200">Baseline Commands</th>
                    <th className="px-2 py-1 text-center text-xs font-semibold text-gray-200">Target Status</th>
                    <th className="px-2 py-1 text-center text-xs font-semibold text-gray-200">Target Commands</th>
                    <th className="px-2 py-1 text-center text-xs font-semibold text-gray-200">Actions Used</th>
                    <th className="px-2 py-1 text-center text-xs font-semibold text-gray-200">Duration (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTestDetails.testComparison.tests.map((test, index) => (                    <tr key={test.id || `${selectedTestDetails.target}-${test.filename}-${test.testName || 'unnamed'}-${index}`} className={`hover:bg-gray-600 ${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                      <td className="px-2 py-1 text-xs">
                        <div className="text-white font-medium truncate max-w-xs" title={test.testName || 'Unnamed test'}>
                          {test.testName || 'Unnamed test'}
                        </div>
                        <div className="text-gray-400 text-xs truncate max-w-xs" title={test.filename}>
                          {test.filename}
                        </div>
                      </td>                      <td className="px-2 py-1 text-center">                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          test.baseline.passed ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                        }`}>
                          {getDisplayStatus(test.baseline.status)}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center text-xs">
                        <div className="text-gray-300 max-w-xs truncate" title={formatCommandFrequency(test.baseline.commands)}>
                          {formatCommandFrequency(test.baseline.commands)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {test.baseline.actionableCommands} total
                        </div>
                      </td>
                      <td className="px-2 py-1 text-center">                        {test.target.executed ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            test.target.passed ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                          }`}>
                            {getDisplayStatus(test.target.status)}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-600 text-gray-300">
                            Not executed
                          </span>
                        )}</td>
                      <td className="px-2 py-1 text-center text-xs">
                        {test.target.executed ? (
                          <>
                            <div className="text-gray-300 max-w-xs truncate" title={formatCommandFrequency(test.target.commands)}>
                              {formatCommandFrequency(test.target.commands)}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {test.target.actionableCommands} total
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-500 text-xs">
                            Not executed
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center text-xs">
                        <div className="text-white">
                          {test.baseline.actionableCommands} → {test.target.actionableCommands}
                        </div>
                        {test.comparison.actionsDifference !== 0 && (
                          <div className={`text-xs ${test.comparison.actionsDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {test.comparison.actionsDifference > 0 ? '+' : ''}{test.comparison.actionsDifference}
                          </div>                        )}
                      </td>
                      <td className="px-2 py-1 text-center text-xs">
                        <div className="text-white">
                          {test.baseline.duration} → {test.target.duration}
                        </div>
                        {test.comparison.durationDifference !== 0 && (
                          <div className={`text-xs ${test.comparison.durationDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {test.comparison.durationDifference > 0 ? '+' : ''}{test.comparison.durationDifference}ms
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                          onClick={e => { e.stopPropagation(); fetchTestFileCode(test.filename, selectedLLM); }}
                        >
                          View Code
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Modal for code display */}
        {codeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={() => setCodeModal(null)}>
            <div className="bg-gray-900 text-white p-6 rounded max-w-6xl w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => setCodeModal(null)}>&times;</button>
              <h2 className="text-lg font-bold mb-4">Código para {codeModal.filePath}</h2>
              {'baselineCode' in codeModal && 'llmCode' in codeModal ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-blue-300 font-semibold mb-2">Baseline</h3>
                    <div className="bg-gray-800 p-2 rounded overflow-x-auto max-h-[60vh] text-xs">
                      <SyntaxHighlighter
                        language="typescript"
                        style={oneDark}
                        customStyle={{ background: '#1E2939', fontSize: '1.15em' }}
                        lineProps={{ style: { background: '#1E2939' } }}
                      >
                        {codeModal.baselineCode}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-green-300 font-semibold mb-2">{codeModal.llmName || 'Generado'}</h3>
                    <div className="bg-gray-800 p-2 rounded overflow-x-auto max-h-[60vh] text-xs">
                      <SyntaxHighlighter
                        language="typescript"
                        style={oneDark}
                        customStyle={{ background: '#1E2939', fontSize: '1.15em' }}
                        lineProps={{ style: { background: '#1E2939' } }}
                      >
                        {codeModal.llmCode}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 p-2 rounded overflow-x-auto max-h-[60vh] text-xs">
                  <SyntaxHighlighter
                    language="typescript"
                    style={oneDark}
                    customStyle={{ background: '#1E2939', fontSize: '1.15em' }}
                    lineProps={{ style: { background: '#1E2939' } }}
                  >
                    {codeModal.code}
                  </SyntaxHighlighter>
                </div>
              )}
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
          </div>

          {/* LLM Selector (for detailed view) */}
          {selectedView === 'detailed' && (
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
        </div>        {/* Content */}
        {selectedView === 'summary' && renderSummaryView()}
        {selectedView === 'detailed' && renderDetailedView()}
      </div>
    </div>
  );
};

export default ActionUsageComparisonView;
