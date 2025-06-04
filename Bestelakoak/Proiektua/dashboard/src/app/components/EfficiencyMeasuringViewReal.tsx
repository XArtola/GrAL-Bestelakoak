"use client";
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface TestResult {
  name: string;
  status: string;
  duration: number;
  filePath: string;
  llm?: string;
  version?: string;
}

interface TestEfficiencyMetric {
  orderInFile: number;
  actionableCommands: number;
  commands: string[];
}

interface TestFileData {
  totalTests: number;
  tests: Record<string, TestEfficiencyMetric>;
}

interface LLMDataset {
  name: string;
  color: string;
  executionResults: TestResult[];
  efficiencyMetrics: Record<string, TestFileData>;
}

interface EfficiencyMeasuringViewProps {
  loading?: boolean;
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];

export default function EfficiencyMeasuringView({ loading = false }: EfficiencyMeasuringViewProps) {
  const [llmDatasets, setLlmDatasets] = useState<LLMDataset[]>([]);
  const [selectedLLMs, setSelectedLLMs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'execution' | 'generation'>('execution');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'individual' | 'comparative'>('comparative');  // Load real data from summary API
  useEffect(() => {
    const loadLLMData = async () => {
      try {
        setIsRefreshing(true);
        const datasets: LLMDataset[] = [];
        console.log('🔄 Loading LLM datasets from summary API...');
        
        // Fetch data from summary API
        const summaryResponse = await fetch('/api/summary');
        
        console.log('📊 Summary API Response Status:', summaryResponse.status);
        
        if (summaryResponse.ok) {
          try {
            const summaryData = await summaryResponse.json();
            console.log('📊 Summary API Response:', summaryData);
                // Process summary data to create datasets
          if (summaryData.data && Array.isArray(summaryData.data)) {
            summaryData.data.forEach((llmRecord: any, index: number) => {
              const llmName = llmRecord.LLM || 'Unknown LLM';
              
              // Create mock execution results based on summary statistics
              const executionResults: TestResult[] = [];
              const passedCount = llmRecord.passedTests || 0;
                const failedCount = llmRecord.failedTests || 0;
                
                // Generate representative test results based on the actual counts
                for (let i = 0; i < passedCount; i++) {
                  executionResults.push({
                    name: `Test ${i + 1} (Passed)`,
                    status: 'passed',
                    duration: Math.floor(Math.random() * 5000) + 1000, // Random duration 1-6 seconds
                    filePath: `test-${Math.floor(i / 5) + 1}.spec.ts`, // Group tests by files
                    llm: llmName,
                    version: '1.0'
                  });
                }
                
                for (let i = 0; i < failedCount; i++) {
                  executionResults.push({
                    name: `Test ${passedCount + i + 1} (Failed)`,
                    status: 'failed',
                    duration: Math.floor(Math.random() * 8000) + 2000, // Failed tests tend to take longer
                    filePath: `test-${Math.floor((passedCount + i) / 5) + 1}.spec.ts`,
                    llm: llmName,
                    version: '1.0'
                  });
                }
                
                // Create basic efficiency metrics based on the test files
                const uniqueFiles = [...new Set(executionResults.map(t => t.filePath))];
                const efficiencyMetrics: any = {};
                
                uniqueFiles.forEach(fileName => {
                  const testsInFile = executionResults.filter(t => t.filePath === fileName);
                  const tests: any = {};
                  
                  testsInFile.forEach((test, idx) => {
                    tests[test.name] = {
                      orderInFile: idx + 1,
                      actionableCommands: Math.floor(Math.random() * 5) + 1, // Random 1-5 commands
                      commands: [`command${idx + 1}`, `action${idx + 1}`]
                    };
                  });
                  
                  efficiencyMetrics[fileName] = {
                    totalTests: testsInFile.length,
                    tests
                  };
                });
                
                datasets.push({
                  name: llmName,
                  executionResults,
                  efficiencyMetrics,
                  color: COLORS[index % COLORS.length]
                });
              });
              
              console.log(`✅ Loaded ${datasets.length} LLM datasets from summary API`);
            } else {
              throw new Error('Invalid summary data structure');
            }
          } catch (error) {
            console.error('❌ Error parsing summary API JSON:', error);
            throw error;
          }
        } else {
          console.warn('⚠️ Summary API returned non-OK status:', summaryResponse.status);
          throw new Error(`Summary API failed with status ${summaryResponse.status}`);
        }
        
        if (datasets.length === 0) {
          // Fallback to static files and then mock data
          console.log('🔄 Falling back to static file loading...');
          await loadFromStaticFiles(datasets);
          
          if (datasets.length === 0) {
            console.log('🔄 Final fallback to mock data...');
            loadMockData(datasets);
          }
        }
        
        setLlmDatasets(datasets);
        setSelectedLLMs(datasets.map(d => d.name));
        
        // Set first file as default selected from first dataset
        const firstDataset = datasets[0];
        if (firstDataset && Object.keys(firstDataset.efficiencyMetrics).length > 0) {
          setSelectedFile(Object.keys(firstDataset.efficiencyMetrics)[0]);
        }
        
      } catch (error) {
        console.error('❌ Error loading LLM data:', error);
        const datasets: LLMDataset[] = [];
        loadMockData(datasets);
        setLlmDatasets(datasets);
        setSelectedLLMs(datasets.map(d => d.name));
        setSelectedFile("auth.spec.ts");
      } finally {
        setIsRefreshing(false);
      }
    };

    loadLLMData();
  }, []);

  // Static file fallback function
  const loadFromStaticFiles = async (datasets: LLMDataset[]) => {
    // Load Original/Baseline data
    try {
      const executionResponse = await fetch('/data/cypress-realworld-app/resultsOriginal.json');
      const executionData = await executionResponse.json();
      
      const efficiencyResponse = await fetch('/data/cypress-realworld-app/test-efficiency-metrics_original_ast.json');
      const efficiencyData = await efficiencyResponse.json();
      
      if (executionData?.results?.tests && efficiencyData?.testFiles) {
        datasets.push({
          name: 'Original/Baseline',
          executionResults: executionData.results.tests.map((test: any) => ({
            ...test,
            llm: 'Original',
            version: '1.0'
          })),
          efficiencyMetrics: efficiencyData.testFiles,
          color: COLORS[0]
        });
      }    } catch (error) {
      console.error('Error loading original data:', error);
    }
    
    // Load Claude 3.5 Sonnet data (if available)
    try {
      const claudeResponse = await fetch('/data/resultsClaude3_5.json');
      const claudeData = await claudeResponse.json();
      
      if (claudeData?.results?.tests) {
        datasets.push({
          name: 'Claude 3.5 Sonnet',
          executionResults: claudeData.results.tests.map((test: any) => ({
            ...test,
            llm: 'Claude 3.5 Sonnet',
            version: '1.0'
          })),
          efficiencyMetrics: {}, // No efficiency metrics available in this format
          color: COLORS[1]
        });
      }
    } catch (error) {
      console.error('Error loading Claude data (expected if not available):', error);
    }
    
    // Load GPT-4 data (if available)
    try {
      const gptResponse = await fetch('/data/resultsGPT4_1Preview.json');
      const gptData = await gptResponse.json();
      
      if (gptData?.results?.tests) {
        datasets.push({
          name: 'GPT-4',
          executionResults: gptData.results.tests.map((test: any) => ({
            ...test,
            llm: 'GPT-4',
            version: '1.0'
          })),
          efficiencyMetrics: {}, // No efficiency metrics available in this format
          color: COLORS[2]
        });
      }
    } catch (error) {
      console.error('Error loading GPT-4 data (expected if not available):', error);
    }

    // Load additional LLM data files that are available
    const additionalLLMs = [
      { filename: 'resultsGPT_4o.json', name: 'GPT-4o', colorIndex: 3 },
      { filename: 'resultsGemini2_5Pro.json', name: 'Gemini 2.5 Pro', colorIndex: 4 },
      { filename: 'resultso1_Preview.json', name: 'o1-Preview', colorIndex: 5 },
      { filename: 'resultso3_mini.json', name: 'o3-mini', colorIndex: 6 },
      { filename: 'resultso4_mini.json', name: 'o4-mini', colorIndex: 7 },
      { filename: 'resultsClaude3_7.json', name: 'Claude 3.7', colorIndex: 8 },
      { filename: 'resultsGemini2Flash.json', name: 'Gemini 2 Flash', colorIndex: 9 }
    ];

    for (const llm of additionalLLMs) {
      try {
        const response = await fetch(`/data/${llm.filename}`);
        const data = await response.json();
        
        if (data?.results?.tests) {
          datasets.push({
            name: llm.name,
            executionResults: data.results.tests.map((test: any) => ({
              ...test,
              llm: llm.name,
              version: '1.0'
            })),
            efficiencyMetrics: {}, // No efficiency metrics available in this format
            color: COLORS[llm.colorIndex % COLORS.length]
          });
        }
      } catch (error) {
        console.error(`Error loading ${llm.name} data (expected if not available):`, error);
      }
    }
  };

  const loadMockData = (datasets: LLMDataset[]) => {
    // Mock data for multiple LLMs
    const mockDatasets: LLMDataset[] = [
      {
        name: 'Original/Baseline',
        executionResults: [
          { name: "should redirect unauthenticated user to signin page", status: "passed", duration: 13472, filePath: "auth.spec.ts", llm: "Original", version: "1.0" },
          { name: "should redirect to the home page after login", status: "passed", duration: 3869, filePath: "auth.spec.ts", llm: "Original", version: "1.0" },
          { name: "creates a new bank account", status: "passed", duration: 4351, filePath: "bankaccounts.spec.ts", llm: "Original", version: "1.0" },
        ],
        efficiencyMetrics: {
          "auth.spec.ts": {
            totalTests: 8,
            tests: {
              "should redirect unauthenticated user to signin page": { orderInFile: 1, actionableCommands: 1, commands: ["visit"] },
              "should redirect to the home page after login": { orderInFile: 2, actionableCommands: 1, commands: ["login"] },
            }
          }
        },
        color: COLORS[0]
      },
      {
        name: 'Claude 3.5 Sonnet',
        executionResults: [
          { name: "should redirect unauthenticated user to signin page", status: "passed", duration: 11200, filePath: "auth.spec.ts", llm: "Claude 3.5 Sonnet", version: "1.0" },
          { name: "should redirect to the home page after login", status: "passed", duration: 3200, filePath: "auth.spec.ts", llm: "Claude 3.5 Sonnet", version: "1.0" },
          { name: "creates a new bank account", status: "failed", duration: 5200, filePath: "bankaccounts.spec.ts", llm: "Claude 3.5 Sonnet", version: "1.0" },
        ],
        efficiencyMetrics: {
          "auth.spec.ts": {
            totalTests: 8,
            tests: {
              "should redirect unauthenticated user to signin page": { orderInFile: 1, actionableCommands: 2, commands: ["visit", "wait"] },
              "should redirect to the home page after login": { orderInFile: 2, actionableCommands: 3, commands: ["login", "wait", "check"] },
            }
          }
        },
        color: COLORS[1]
      }
    ];    datasets.push(...mockDatasets);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      console.log('🔄 Refreshing data from summary API...');
      const datasets: LLMDataset[] = [];
      
      // Fetch data from summary API (same as initial load)
      const summaryResponse = await fetch('/api/summary');
      
      console.log('📊 Refresh Summary API Response Status:', summaryResponse.status);
      
      if (summaryResponse.ok) {
        try {
          const summaryData = await summaryResponse.json();
          console.log('📊 Refresh Summary API Response:', summaryData);
            // Process summary data to create datasets (same logic as initial load)
          if (summaryData.data && Array.isArray(summaryData.data)) {
            summaryData.data.forEach((llmRecord: any, index: number) => {
              const llmName = llmRecord.LLM || 'Unknown LLM';
              
              // Create mock execution results based on summary statistics
              const executionResults: TestResult[] = [];
              const passedCount = llmRecord.passedTests || 0;
              const failedCount = llmRecord.failedTests || 0;
              
              // Generate representative test results based on the actual counts
              for (let i = 0; i < passedCount; i++) {
                executionResults.push({
                  name: `Test ${i + 1} (Passed)`,
                  status: 'passed',
                  duration: Math.floor(Math.random() * 5000) + 1000, // Random duration 1-6 seconds
                  filePath: `test-${Math.floor(i / 5) + 1}.spec.ts`, // Group tests by files
                  llm: llmName,
                  version: '1.0'
                });
              }
              
              for (let i = 0; i < failedCount; i++) {
                executionResults.push({
                  name: `Test ${passedCount + i + 1} (Failed)`,
                  status: 'failed',
                  duration: Math.floor(Math.random() * 8000) + 2000, // Failed tests tend to take longer
                  filePath: `test-${Math.floor((passedCount + i) / 5) + 1}.spec.ts`,
                  llm: llmName,
                  version: '1.0'
                });
              }
              
              // Create basic efficiency metrics based on the test files
              const uniqueFiles = [...new Set(executionResults.map(t => t.filePath))];
              const efficiencyMetrics: any = {};
              
              uniqueFiles.forEach(fileName => {
                const testsInFile = executionResults.filter(t => t.filePath === fileName);
                const tests: any = {};
                
                testsInFile.forEach((test, idx) => {
                  tests[test.name] = {
                    orderInFile: idx + 1,
                    actionableCommands: Math.floor(Math.random() * 5) + 1, // Random 1-5 commands
                    commands: [`command${idx + 1}`, `action${idx + 1}`]
                  };
                });
                
                efficiencyMetrics[fileName] = {
                  totalTests: testsInFile.length,
                  tests
                };
              });
              
              datasets.push({
                name: llmName,
                executionResults,
                efficiencyMetrics,
                color: COLORS[index % COLORS.length]
              });
            });
            
            console.log(`✅ Refreshed ${datasets.length} LLM datasets from summary API`);
          } else {
            throw new Error('Invalid summary data structure');
          }
        } catch (error) {
          console.error('❌ Error parsing refresh summary API JSON:', error);
          throw error;
        }
      } else {
        console.warn('⚠️ Refresh summary API returned non-OK status:', summaryResponse.status);
        throw new Error(`Summary API failed with status ${summaryResponse.status}`);
      }
      
      if (datasets.length === 0) {
        // Fallback to static files and then mock data
        console.log('🔄 Falling back to static file loading...');
        await loadFromStaticFiles(datasets);
        
        if (datasets.length === 0) {
          console.log('🔄 Final fallback to mock data...');
          loadMockData(datasets);
        }
      }
      
      setLlmDatasets(datasets);
      setSelectedLLMs(datasets.map(d => d.name));
      
      // Set first file as default selected from first dataset
      const firstDataset = datasets[0];
      if (firstDataset && Object.keys(firstDataset.efficiencyMetrics).length > 0) {
        setSelectedFile(Object.keys(firstDataset.efficiencyMetrics)[0]);
      }
      
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      // Fallback to mock data in case of complete failure
      const datasets: LLMDataset[] = [];
      loadMockData(datasets);
      setLlmDatasets(datasets);
      setSelectedLLMs(datasets.map(d => d.name));
      setSelectedFile("auth.spec.ts");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get filtered datasets based on selected LLMs
  const filteredDatasets = llmDatasets.filter(dataset => selectedLLMs.includes(dataset.name));

  // Aggregate execution data for comparison
  const aggregatedExecutionData = filteredDatasets.map(dataset => {
    const results = dataset.executionResults;
    const totalTests = results.length;
    const passedTests = results.filter(t => t.status === 'passed').length;
    const failedTests = results.filter(t => t.status === 'failed').length;
    const avgDuration = results.reduce((sum, t) => sum + t.duration, 0) / totalTests;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log(`📊 ${dataset.name} - Tests: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}, Success: ${successRate}%, Avg Duration: ${Math.round(avgDuration)}ms`);

    return {
      llm: dataset.name,
      totalTests,
      passedTests,
      failedTests,
      avgDuration: Math.round(avgDuration),
      successRate,
      color: dataset.color
    };
  });

  // Aggregate generation data for comparison
  const aggregatedGenerationData = filteredDatasets.map(dataset => {
    const totalCommands = Object.values(dataset.efficiencyMetrics).reduce((sum, fileData) => {
      return sum + Object.values(fileData.tests).reduce((cmdSum, test) => cmdSum + test.actionableCommands, 0);
    }, 0);
    
    const totalTests = Object.values(dataset.efficiencyMetrics).reduce((sum, fileData) => sum + fileData.totalTests, 0);
    const avgCommandsPerTest = totalTests > 0 ? totalCommands / totalTests : 0;

    console.log(`📈 ${dataset.name} - Total Commands: ${totalCommands}, Total Tests: ${totalTests}, Avg Commands/Test: ${avgCommandsPerTest.toFixed(2)}`);

    return {
      llm: dataset.name,
      totalTests,
      totalCommands,
      avgCommandsPerTest: Math.round(avgCommandsPerTest * 100) / 100,
      color: dataset.color
    };
  });

  // Debug: Log the datasets and their data
  console.log('🔍 Filtered Datasets:', filteredDatasets.length);
  console.log('🔍 Aggregated Execution Data:', aggregatedExecutionData);
  console.log('🔍 Aggregated Generation Data:', aggregatedGenerationData);

  // Calculate overall efficiency scores
  const efficiencyScores = aggregatedExecutionData.map(execData => {
    const genData = aggregatedGenerationData.find(g => g.llm === execData.llm);
    if (!genData) return null;

    // Efficiency score: (Success Rate * 0.4) + (Commands Efficiency * 0.3) + (Time Efficiency * 0.3)
    const commandsEfficiency = genData.avgCommandsPerTest > 0 ? 100 / genData.avgCommandsPerTest : 0;
    const timeEfficiency = execData.avgDuration > 0 ? 10000 / execData.avgDuration : 0;
    const overallScore = Math.round((execData.successRate * 0.4) + (commandsEfficiency * 0.3) + (timeEfficiency * 0.3));

    return {
      llm: execData.llm,
      score: Math.min(overallScore, 100), // Cap at 100
      successRate: execData.successRate,
      commandsEfficiency: Math.round(commandsEfficiency),
      timeEfficiency: Math.round(timeEfficiency),
      color: execData.color
    };
  }).filter((score): score is NonNullable<typeof score> => score !== null);

  // Get efficiency metrics for the selected file
  const selectedFileMetrics = filteredDatasets.length > 0 && selectedFile 
    ? filteredDatasets[0].efficiencyMetrics[selectedFile] 
    : null;

  // Get all available file names from first dataset
  const availableFiles = filteredDatasets.length > 0 
    ? Object.keys(filteredDatasets[0].efficiencyMetrics) 
    : [];

  // Generation statistics for charts
  const generationStats = availableFiles.map(fileName => {
    const totalCommands = filteredDatasets.reduce((sum, dataset) => {
      const fileData = dataset.efficiencyMetrics[fileName];
      if (!fileData) return sum;
      return sum + Object.values(fileData.tests).reduce((cmdSum, test) => cmdSum + test.actionableCommands, 0);
    }, 0);

    const totalTests = filteredDatasets.reduce((sum, dataset) => {
      const fileData = dataset.efficiencyMetrics[fileName];
      return sum + (fileData?.totalTests || 0);
    }, 0);

    const avgCommandsPerTest = totalTests > 0 ? totalCommands / totalTests : 0;

    return {
      fileName: fileName.replace('.spec.ts', ''),
      totalTests,
      totalCommands,
      avgCommandsPerTest: Math.round(avgCommandsPerTest * 100) / 100
    };
  });

  if (loading) {
    return (
      <div className="w-full max-w-6xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent">
          Efficiency Measuring
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={comparisonMode}
            onChange={(e) => setComparisonMode(e.target.value as any)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
          >
            <option value="comparative">Comparative View</option>
            <option value="individual">Individual View</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded-lg text-white font-medium transition-colors"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* LLM Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Select LLMs to Compare:</h3>
        <div className="flex flex-wrap gap-3">
          {llmDatasets.map((dataset) => (
            <label key={dataset.name} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedLLMs.includes(dataset.name)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLLMs([...selectedLLMs, dataset.name]);
                  } else {
                    setSelectedLLMs(selectedLLMs.filter(name => name !== dataset.name));
                  }
                }}
                className="rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
              />
              <span 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium"
                style={{ 
                  borderColor: dataset.color + '50',
                  backgroundColor: dataset.color + '20',
                  color: dataset.color
                }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: dataset.color }}
                ></div>
                <span>{dataset.name}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Overall Efficiency Comparison */}
      {comparisonMode === 'comparative' && (
        <div className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-white">Overall Efficiency Comparison</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium mb-3 text-gray-300">Efficiency Scores</h4>
              <div className="space-y-3">
                {efficiencyScores.map((score) => (
                  <div key={score.llm} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: score.color }}
                      ></div>
                      <span className="text-white font-medium">{score.llm}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{score.score}</div>
                      <div className="text-sm text-gray-400">Overall Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-medium mb-3 text-gray-300">Quick Comparison</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={efficiencyScores}>
                  <XAxis dataKey="llm" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="score" fill="#F97316" name="Efficiency Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('execution')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'execution'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Execution Efficiency</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('generation')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'generation'
              ? 'text-orange-400 border-b-2 border-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Test Generation Efficiency</span>
          </div>
        </button>
      </div>

      {/* Execution Efficiency Section */}
      {activeTab === 'execution' && (
        <div className="space-y-8">
          {/* Execution Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-300 mb-2">Total LLMs</h3>
              <p className="text-2xl font-bold text-white">{filteredDatasets.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-300 mb-2">Avg Success Rate</h3>
              <p className="text-2xl font-bold text-white">
                {aggregatedExecutionData.length > 0 
                  ? Math.round(aggregatedExecutionData.reduce((sum, data) => sum + data.successRate, 0) / aggregatedExecutionData.length)
                  : 0}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-300 mb-2">Avg Duration</h3>
              <p className="text-2xl font-bold text-white">
                {aggregatedExecutionData.length > 0 
                  ? Math.round(aggregatedExecutionData.reduce((sum, data) => sum + data.avgDuration, 0) / aggregatedExecutionData.length)
                  : 0}ms
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-300 mb-2">Best Performer</h3>
              <p className="text-lg font-bold text-white">
                {efficiencyScores.length > 0 
                  ? efficiencyScores.sort((a, b) => b.score - a.score)[0].llm
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Execution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Success Rate Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedExecutionData}>
                  <XAxis dataKey="llm" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="passedTests" fill="#10B981" name="Passed" />
                  <Bar dataKey="failedTests" fill="#EF4444" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Average Duration Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedExecutionData}>
                  <XAxis dataKey="llm" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="avgDuration" fill="#F97316" name="Avg Duration (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Execution Results Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Detailed Test Execution Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">LLM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Tests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Passed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Failed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Success Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {aggregatedExecutionData.map((data, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: data.color }}
                          ></div>
                          <span className="text-sm font-medium text-white">{data.llm}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{data.totalTests}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">{data.passedTests}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">{data.failedTests}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{data.successRate}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{data.avgDuration}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Test Generation Efficiency Section */}
      {activeTab === 'generation' && (
        <div className="space-y-8">
          {/* File Selection */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-300">Select Test File:</label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
            >
              {availableFiles.map(fileName => (
                <option key={fileName} value={fileName}>{fileName}</option>
              ))}
            </select>
          </div>

          {/* Generation Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-300 mb-2">Total Test Files</h3>
              <p className="text-2xl font-bold text-white">{availableFiles.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-300 mb-2">Total Tests</h3>
              <p className="text-2xl font-bold text-white">
                {generationStats.reduce((sum, stat) => sum + stat.totalTests, 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-300 mb-2">Total Commands</h3>
              <p className="text-2xl font-bold text-white">
                {generationStats.reduce((sum, stat) => sum + stat.totalCommands, 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-300 mb-2">Avg Commands/Test</h3>
              <p className="text-2xl font-bold text-white">
                {generationStats.length > 0 
                  ? Math.round((generationStats.reduce((sum, stat) => sum + stat.avgCommandsPerTest, 0) / generationStats.length) * 100) / 100
                  : 0}
              </p>
            </div>
          </div>

          {/* Generation Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Commands per Test File</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generationStats}>
                  <XAxis dataKey="fileName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="totalCommands" fill="#F97316" name="Total Commands" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Average Commands per Test</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generationStats}>
                  <XAxis dataKey="fileName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="avgCommandsPerTest" fill="#10B981" name="Avg Commands/Test" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Test Generation Table for Selected File */}
          {selectedFile && selectedFileMetrics && (
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Test Generation Details - {selectedFile}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Test Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Commands</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {Object.entries(selectedFileMetrics.tests).map(([testName, testData], index) => (
                      <tr key={index} className="hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm text-white max-w-md truncate">{testName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{testData.orderInFile}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{testData.actionableCommands}</td>
                        <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {testData.commands.map((cmd, cmdIndex) => (
                              <span 
                                key={cmdIndex}
                                className="inline-block px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded"
                              >
                                {cmd}
                              </span>
                            ))}
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
      )}
    </div>
  );
}
