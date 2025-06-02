"use client";
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ModernResultsViewProps {
  resultsData: any[];
  summaryData: any[];
  resultsLoading: boolean;
  summaryLoading: boolean;
  resultsByLLMVersion: Map<string, { files: Map<string, { total: number; passed: number }> }>;
  chartData: any[];
  handleBarClick: (e: any) => void;
  sortCriteria: string;
  setSortCriteria: (criteria: string) => void;
}

const ModernResultsView: React.FC<ModernResultsViewProps> = ({
  resultsData,
  summaryData,
  resultsLoading,
  summaryLoading,
  resultsByLLMVersion,
  chartData,
  handleBarClick,
  sortCriteria,
  setSortCriteria
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "detailed" | "analytics">("overview");
  
  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];
  
  // Calculate overall statistics
  const overallStats = React.useMemo(() => {
    if (!resultsData.length) return { total: 0, passed: 0, failed: 0, passRate: 0 };
    
    const totalTests = resultsData.reduce((sum, item) => sum + (item.results?.summary?.tests || 0), 0);
    const passedTests = resultsData.reduce((sum, item) => sum + (item.results?.summary?.passed || 0), 0);
    const failedTests = resultsData.reduce((sum, item) => sum + (item.results?.summary?.failed || 0), 0);
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    };
  }, [resultsData]);

  // Prepare pie chart data
  const pieData = React.useMemo(() => {
    if (!resultsData.length) return [];
    
    const statusCounts = resultsData.reduce((acc, item) => {
      const summary = item.results?.summary || {};
      acc.passed += summary.passed || 0;
      acc.failed += summary.failed || 0;
      acc.skipped += summary.skipped || 0;
      acc.pending += summary.pending || 0;
      return acc;
    }, { passed: 0, failed: 0, skipped: 0, pending: 0 });

    return [
      { name: 'Passed', value: statusCounts.passed, color: '#10B981' },
      { name: 'Failed', value: statusCounts.failed, color: '#EF4444' },
      { name: 'Skipped', value: statusCounts.skipped, color: '#F59E0B' },
      { name: 'Pending', value: statusCounts.pending, color: '#3B82F6' }
    ].filter(item => item.value > 0);
  }, [resultsData]);

  const TabButton = ({ id, label, isActive, onClick }: { id: string, label: string, isActive: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 relative overflow-hidden ${
        isActive
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-500/20 animate-pulse" />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );

  const StatCard = ({ title, value, subtitle, color, icon }: { title: string, value: string | number, subtitle?: string, color: string, icon: React.ReactNode }) => (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{value}</div>
          {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
        </div>
      </div>
      <h3 className="text-gray-300 font-medium">{title}</h3>
    </div>
  );

  const ProgressBar = ({ passed, total, label }: { passed: number, total: number, label: string }) => {
    const percentage = total > 0 ? (passed / total) * 100 : 0;
    const status = percentage === 100 ? 'success' : percentage >= 80 ? 'warning' : 'error';
    
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          <span className="text-sm text-gray-400">{passed}/{total} ({percentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
              status === 'success' ? 'bg-gradient-to-r from-green-400 to-green-600' :
              status === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
              'bg-gradient-to-r from-red-400 to-red-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const FileStatusCard = ({ filePath, stats }: { filePath: string, stats: { total: number, passed: number } }) => {
    const isPassing = stats.passed === stats.total;
    const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    
    return (
      <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-700/30 rounded-lg p-4 hover:border-gray-600/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-200 truncate flex-1 mr-3">{filePath}</h4>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isPassing ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {isPassing ? 'PASS' : 'FAIL'}
          </div>
        </div>
        <ProgressBar passed={stats.passed} total={stats.total} label="" />
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>Pass Rate: {passRate.toFixed(1)}%</span>
          <span>{stats.passed} passed, {stats.total - stats.passed} failed</span>
        </div>
      </div>
    );
  };

  if (resultsLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Modern Test Results Dashboard
        </h1>
        <p className="text-gray-400 text-lg">Advanced analytics and insights for your test execution data</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center space-x-2 bg-gray-800/30 backdrop-blur-sm rounded-xl p-2 border border-gray-700/30">
        <TabButton id="overview" label="Overview" isActive={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
        <TabButton id="detailed" label="Detailed Analysis" isActive={activeTab === "detailed"} onClick={() => setActiveTab("detailed")} />
        <TabButton id="analytics" label="Advanced Analytics" isActive={activeTab === "analytics"} onClick={() => setActiveTab("analytics")} />
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Tests"
              value={overallStats.total}
              color="from-blue-500 to-blue-600"
              icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <StatCard
              title="Tests Passed"
              value={overallStats.passed}
              subtitle={`${overallStats.passRate}% success rate`}
              color="from-green-500 to-green-600"
              icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
            />
            <StatCard
              title="Tests Failed"
              value={overallStats.failed}
              color="from-red-500 to-red-600"
              icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
            />
            <StatCard
              title="Active LLMs"
              value={resultsData.length}
              color="from-purple-500 to-purple-600"
              icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Performance by LLM</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 40, right: 40, bottom: 40 }}>
                    <XAxis 
                      dataKey="name" 
                      angle={-20} 
                      textAnchor="end" 
                      interval={0} 
                      height={60} 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }} 
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151', 
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="Passed" fill="#10B981" cursor="pointer" onClick={handleBarClick} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Failed" fill="#EF4444" cursor="pointer" onClick={handleBarClick} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Skipped" fill="#F59E0B" cursor="pointer" onClick={handleBarClick} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Pending" fill="#3B82F6" cursor="pointer" onClick={handleBarClick} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Test Status Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151', 
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis Tab */}
      {activeTab === "detailed" && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white">Detailed Test Results by LLM</h2>
          {Array.from(resultsByLLMVersion.entries()).map(([llmVersionKey, data]) => (
            <div key={llmVersionKey} className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">{llmVersionKey}</h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400">
                    {data.files.size} test files
                  </span>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              
              {data.files.size > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Array.from(data.files.entries()).map(([filePath, stats]) => (
                    <FileStatusCard key={filePath} filePath={filePath} stats={stats} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-lg">⚠️ No test data found for this LLM</div>
                  <p className="text-gray-400 mt-2">This LLM might need to run tests first</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Advanced Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white">Advanced Test Analytics</h2>
          
          {/* Sort Controls */}
          <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-700/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sort & Filter Options</h3>
            <div className="flex flex-wrap gap-3">
              {['tests', 'passed', 'failed', 'skipped', 'pending'].map((criteria) => (
                <button
                  key={criteria}
                  onClick={() => setSortCriteria(criteria)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    sortCriteria === criteria
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
                  }`}
                >
                  Sort by {criteria.charAt(0).toUpperCase() + criteria.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Data Section */}
          {summaryLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-700 rounded w-1/3"></div>
              <div className="h-32 bg-gray-700 rounded-xl"></div>
            </div>
          ) : summaryData.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Execution Summary</h3>
              {summaryData.map((summary, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/30 rounded-xl p-6">
                  <h4 className="text-lg font-medium text-white mb-4">📁 {summary.filePath}</h4>
                  {summary.tests && summary.tests.length > 0 ? (
                    <div className="space-y-4">
                      {summary.tests.map((test: { name: string; attempts: any[] }, testIndex: number) => (
                        <div key={testIndex} className="bg-gray-900/30 rounded-lg p-4">
                          <h5 className="font-medium text-gray-200 mb-3">🧪 {test.name}</h5>
                          {test.attempts && test.attempts.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-700">
                                    <th className="px-3 py-2 text-left text-gray-300">LLM</th>
                                    <th className="px-3 py-2 text-left text-gray-300">Version</th>
                                    <th className="px-3 py-2 text-left text-gray-300">Status</th>
                                    <th className="px-3 py-2 text-left text-gray-300">Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {test.attempts.map((attempt, attemptIndex) => (
                                    attempt.results && attempt.results.length > 0 ? (
                                      attempt.results.map((result: { status: string; duration: number }, resultIndex: number) => (
                                        <tr key={`${attemptIndex}-${resultIndex}`} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                          <td className="px-3 py-2 text-gray-200">{attempt.LLM}</td>
                                          <td className="px-3 py-2 text-gray-200">{attempt.version}</td>
                                          <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                              result.status === 'passed' ? 'bg-green-500/20 text-green-400' :
                                              result.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                              'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                              {result.status.toUpperCase()}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-gray-200">{result.duration}ms</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr key={attemptIndex} className="border-b border-gray-800/50">
                                        <td className="px-3 py-2 text-gray-200">{attempt.LLM}</td>
                                        <td className="px-3 py-2 text-gray-200">{attempt.version}</td>
                                        <td className="px-3 py-2 text-gray-400" colSpan={2}>No results available</td>
                                      </tr>
                                    )
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-yellow-400">
                              ⚠️ No attempt data available for this test
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-yellow-400 text-lg">📋 No test data found</div>
                      <p className="text-gray-400 mt-2">This file path might not have any executed tests</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-xl">📊 No summary data available</div>
              <p className="text-gray-500 mt-2">Run tests to generate summary analytics</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModernResultsView;
