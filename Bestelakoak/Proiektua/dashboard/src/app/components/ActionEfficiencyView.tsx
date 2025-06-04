"use client";
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';

interface ActionCommand {
  command: string;
  count: number;
}

interface EfficiencyMetrics {
  llm: string;
  summary: {
    totalActionableCommands: number;
    totalTests: number;
    averageCommandsPerTest: number;
    totalFiles: number;
    commandBreakdown: ActionCommand[];
    mostUsedCommands: string[];
  };
}

interface LLMComparison {
  llm: string;
  actionMetrics: {
    totalCommands: number;
    averageCommandsPerTest: number;
    totalTests: number;
    commandEfficiency: number;
  };
  performanceMetrics: {
    rank: number;
    overallScore: number;
    codeQuality: number;
    executionSuccess: number;
    passRate: number;
  } | null;
}

interface EfficiencyData {
  localData: {
    report: any;
    actionMetrics: EfficiencyMetrics[];
    summary: {
      totalLLMs: number;
      totalUniqueCommands: string[];
      globalCommandBreakdown: ActionCommand[];
      llmComparison: LLMComparison[];
    };
  } | null;
  mongoData: any;
}

interface EfficiencyMeasuringViewProps {
  loading?: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#ff6b6b', '#4ecdc4', '#45b7d1'];

export default function EfficiencyMeasuringView({ loading = false }: EfficiencyMeasuringViewProps) {
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData | null>(null);
  const [activeTab, setActiveTab] = useState<'commands' | 'comparison' | 'breakdown'>('commands');
  const [selectedLLM, setSelectedLLM] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchEfficiencyData();
  }, []);

  const fetchEfficiencyData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/efficiency?source=local&details=false');
      if (response.ok) {
        const data = await response.json();
        setEfficiencyData(data);
      } else {
        console.error('Failed to fetch efficiency data');
      }
    } catch (error) {
      console.error('Error fetching efficiency data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchEfficiencyData();
  };

  // Prepare data for charts
  const getCommandBreakdownData = () => {
    if (!efficiencyData?.localData?.summary.globalCommandBreakdown) return [];
    
    return efficiencyData.localData.summary.globalCommandBreakdown
      .slice(0, 15) // Top 15 commands
      .map(cmd => ({
        command: cmd.command,
        count: cmd.count,
        percentage: ((cmd.count / efficiencyData.localData!.summary.globalCommandBreakdown.reduce((sum, c) => sum + c.count, 0)) * 100).toFixed(1)
      }));
  };

  const getLLMComparisonData = () => {
    if (!efficiencyData?.localData?.summary.llmComparison) return [];
    
    return efficiencyData.localData.summary.llmComparison.map(llm => ({
      llm: llm.llm.replace(/_/g, ' ').toUpperCase(),
      totalCommands: llm.actionMetrics.totalCommands,
      averagePerTest: llm.actionMetrics.averageCommandsPerTest,
      totalTests: llm.actionMetrics.totalTests,
      efficiency: llm.actionMetrics.commandEfficiency,
      overallScore: llm.performanceMetrics?.overallScore || 0,
      rank: llm.performanceMetrics?.rank || 999
    }));
  };

  const getEfficiencyScatterData = () => {
    if (!efficiencyData?.localData?.summary.llmComparison) return [];
    
    return efficiencyData.localData.summary.llmComparison.map(llm => ({
      x: llm.actionMetrics.averageCommandsPerTest,
      y: llm.performanceMetrics?.overallScore || 0,
      llm: llm.llm.replace(/_/g, ' ').toUpperCase(),
      totalTests: llm.actionMetrics.totalTests
    }));
  };

  // Calculate aggregated stats for display
  const getAggregatedStats = () => {
    if (!efficiencyData?.localData) return { totalCommands: 0, totalTests: 0, totalLLMs: 0, avgCommandsPerTest: 0 };
    
    const { actionMetrics } = efficiencyData.localData;
    const totalCommands = actionMetrics.reduce((sum, metric) => sum + metric.summary.totalActionableCommands, 0);
    const totalTests = actionMetrics.reduce((sum, metric) => sum + metric.summary.totalTests, 0);
    
    return {
      totalCommands,
      totalTests,
      totalLLMs: actionMetrics.length,
      avgCommandsPerTest: totalTests > 0 ? totalCommands / totalTests : 0
    };
  };

  if (loading || isRefreshing) {
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

  const stats = getAggregatedStats();
  const commandData = getCommandBreakdownData();
  const comparisonData = getLLMComparisonData();
  const scatterData = getEfficiencyScatterData();

  return (
    <div className="w-full max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent">
          Action Usage Efficiency Analysis
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedLLM}
            onChange={(e) => setSelectedLLM(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All LLMs</option>
            {efficiencyData?.localData?.actionMetrics.map(metric => (
              <option key={metric.llm} value={metric.llm}>
                {metric.llm.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Commands</p>
              <p className="text-2xl font-bold text-orange-400">{stats.totalCommands.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-orange-900/20 rounded-lg">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Tests</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalTests.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-900/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Commands/Test</p>
              <p className="text-2xl font-bold text-green-400">{stats.avgCommandsPerTest.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-green-900/20 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">LLMs Analyzed</p>
              <p className="text-2xl font-bold text-purple-400">{stats.totalLLMs}</p>
            </div>
            <div className="p-3 bg-purple-900/20 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('commands')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'commands'
              ? 'text-orange-400 border-b-2 border-orange-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Command Breakdown</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'comparison'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>LLM Comparison</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'breakdown'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Efficiency Analysis</span>
          </div>
        </button>
      </div>

      {/* Command Breakdown Tab */}
      {activeTab === 'commands' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Command Usage Distribution</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={commandData}>
                  <XAxis dataKey="command" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="#F97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Command Types Pie Chart</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={commandData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ command, percentage }) => `${command}: ${percentage}%`}
                  >
                    {commandData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Command Usage Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Command</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {commandData.map((cmd, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{cmd.command}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{cmd.count.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{cmd.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LLM Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Command Count by LLM</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData}>
                  <XAxis dataKey="llm" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="totalCommands" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Average Commands per Test</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData}>
                  <XAxis dataKey="llm" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="averagePerTest" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">LLM Performance Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">LLM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Commands</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Commands/Test</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Tests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Overall Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {comparisonData.map((llm, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{llm.llm}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">#{llm.rank}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{llm.totalCommands.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{llm.averagePerTest.toFixed(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{llm.totalTests}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{(llm.overallScore * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Efficiency Analysis Tab */}
      {activeTab === 'breakdown' && (
        <div className="space-y-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-white">Efficiency vs Command Usage Scatter Plot</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart data={scatterData}>
                <XAxis 
                  dataKey="x" 
                  stroke="#9CA3AF"
                  name="Avg Commands per Test"
                  label={{ value: 'Average Commands per Test', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="y" 
                  stroke="#9CA3AF"
                  name="Overall Score"
                  label={{ value: 'Overall Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-lg">
                          <p className="text-white font-medium">{data.llm}</p>
                          <p className="text-gray-300">Avg Commands/Test: {data.x.toFixed(1)}</p>
                          <p className="text-gray-300">Overall Score: {(data.y * 100).toFixed(1)}%</p>
                          <p className="text-gray-300">Total Tests: {data.totalTests}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter dataKey="y" fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Key Insights</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Lower commands per test may indicate more efficient code generation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">Higher overall scores suggest better test quality</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="text-gray-300">Optimal balance: moderate commands with high scores</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Performance Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Best Overall Score:</span>
                  <span className="text-green-400 font-medium">
                    {comparisonData.length > 0 ? `${Math.max(...comparisonData.map(d => d.overallScore * 100)).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Most Efficient:</span>
                  <span className="text-blue-400 font-medium">
                    {comparisonData.length > 0 ? `${Math.min(...comparisonData.map(d => d.averagePerTest)).toFixed(1)} cmd/test` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Commands:</span>
                  <span className="text-orange-400 font-medium">
                    {comparisonData.length > 0 ? comparisonData.reduce((sum, d) => sum + d.totalCommands, 0).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
