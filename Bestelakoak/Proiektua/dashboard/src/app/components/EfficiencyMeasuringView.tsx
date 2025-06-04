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
  const [activeTab, setActiveTab] = useState<'commands' | 'comparison' | 'breakdown' | 'generation' | 'execution'>('commands');
  const [selectedLLM, setSelectedLLM] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
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

  // Placeholder data for test generation and execution analysis
  // TODO: Replace with actual data from efficiency metrics when available
  const aggregatedGenerationData: any[] = [];
  const aggregatedExecutionData: any[] = [];

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
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
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

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8 border-b border-gray-700">
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
      </div>

      {/* Test Generation Efficiency Section */}
      {activeTab === 'generation' && (
        <div className="space-y-8">
          {/* Generation Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-300 mb-2">Avg Generation Time</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round(aggregatedGenerationData.reduce((sum, item) => sum + item.avgGenerationTime, 0) / aggregatedGenerationData.length || 0)}s
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-300 mb-2">Avg Code Quality</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round(aggregatedGenerationData.reduce((sum, item) => sum + item.avgCodeQuality, 0) / aggregatedGenerationData.length || 0)}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-300 mb-2">Avg Syntax Accuracy</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round(aggregatedGenerationData.reduce((sum, item) => sum + item.avgSyntaxAccuracy, 0) / aggregatedGenerationData.length || 0)}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-300 mb-2">Total Tests Generated</h3>
              <p className="text-2xl font-bold text-white">
                {aggregatedGenerationData.reduce((sum, item) => sum + item.totalTestsGenerated, 0)}
              </p>
            </div>
          </div>

          {/* Generation Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Generation Time Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedGenerationData.map(item => ({
                  name: item.llm,
                  'Generation Time (s)': Math.round(item.avgGenerationTime),
                }))}>
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="Generation Time (s)" fill="#F97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Code Quality Metrics</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedGenerationData.map(item => ({
                  name: item.llm,
                  'Code Quality': Math.round(item.avgCodeQuality),
                  'Syntax Accuracy': Math.round(item.avgSyntaxAccuracy),
                  'Context Relevance': Math.round(item.avgContextRelevance),
                }))}>
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="Code Quality" fill="#10B981" />
                  <Bar dataKey="Syntax Accuracy" fill="#3B82F6" />
                  <Bar dataKey="Context Relevance" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Generation Details Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Test Generation Detailed Metrics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">LLM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Generation Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Code Quality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Syntax Accuracy</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Context Relevance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tests Generated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Generation Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {aggregatedGenerationData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.llm}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgGenerationTime)}s</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgCodeQuality)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgSyntaxAccuracy)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgContextRelevance)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.totalTestsGenerated}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgGenerationRate)} tests/min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Execution Efficiency Section */}
      {activeTab === 'execution' && (
        <div className="space-y-8">
          {/* Execution Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-300 mb-2">Avg Execution Time</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round(aggregatedExecutionData.reduce((sum, item) => sum + item.avgExecutionTime, 0) / aggregatedExecutionData.length || 0)}ms
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-300 mb-2">Avg Success Rate</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round(aggregatedExecutionData.reduce((sum, item) => sum + item.avgSuccessRate, 0) / aggregatedExecutionData.length || 0)}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-300 mb-2">Avg Memory Usage</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round(aggregatedExecutionData.reduce((sum, item) => sum + item.avgMemoryUsage, 0) / aggregatedExecutionData.length || 0)}MB
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-300 mb-2">Avg Energy Efficiency</h3>
              <p className="text-2xl font-bold text-white">
                {Math.round(aggregatedExecutionData.reduce((sum, item) => sum + item.avgEnergyEfficiency, 0) / aggregatedExecutionData.length || 0)}%
              </p>
            </div>
          </div>

          {/* Execution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Execution Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedExecutionData.map(item => ({
                  name: item.llm,
                  'Execution Time (ms)': Math.round(item.avgExecutionTime),
                  'Success Rate (%)': Math.round(item.avgSuccessRate),
                }))}>
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="Execution Time (ms)" fill="#3B82F6" />
                  <Bar dataKey="Success Rate (%)" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Resource Usage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedExecutionData.map(item => ({
                  name: item.llm,
                  'Memory (MB)': Math.round(item.avgMemoryUsage),
                  'CPU (%)': Math.round(item.avgCpuUsage),
                  'Energy Efficiency': Math.round(item.avgEnergyEfficiency),
                }))}>
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="Memory (MB)" fill="#8B5CF6" />
                  <Bar dataKey="CPU (%)" fill="#F59E0B" />
                  <Bar dataKey="Energy Efficiency" fill="#EAB308" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Execution Details Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Execution Efficiency Detailed Metrics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">LLM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Avg Execution Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Success Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Memory Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">CPU Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Energy Efficiency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Failure Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {aggregatedExecutionData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.llm}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgExecutionTime)}ms</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgSuccessRate)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgMemoryUsage)}MB</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgCpuUsage)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgEnergyEfficiency)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{Math.round(item.avgFailureRate)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
