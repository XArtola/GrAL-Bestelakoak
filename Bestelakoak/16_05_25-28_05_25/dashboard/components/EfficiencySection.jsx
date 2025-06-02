'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function EfficiencySection() {
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEfficiencyData();
  }, []);

  const loadEfficiencyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/efficiency?summary=true');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setEfficiencyData(data);
    } catch (error) {
      console.error('Error loading efficiency data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = (genEff, execEff) => {
    return ((genEff + execEff) / 2 * 100).toFixed(1);
  };

  const getEfficiencyColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatChartData = () => {
    return efficiencyData.map(model => ({
      name: model.llmModel,
      'Generation Efficiency': (model.avgGenerationEfficiency * 100).toFixed(1),
      'Execution Efficiency': (model.avgExecutionEfficiency * 100).toFixed(1),
      'Pass Rate': ((model.passedTests / model.totalTests) * 100).toFixed(1)
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">LLM Efficiency Metrics</h2>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading efficiency data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">LLM Efficiency Metrics</h2>
        <div className="text-center text-red-500 py-8">
          <p>Error loading efficiency data: {error}</p>
          <button 
            onClick={loadEfficiencyData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">LLM Efficiency Metrics</h2>
        <button 
          onClick={loadEfficiencyData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {efficiencyData.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-lg font-medium">No efficiency data available</p>
          <p className="text-sm text-gray-400 mt-2">
            Upload test results using the process-efficiency script to see metrics.
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">To add data, run:</p>
            <code className="text-xs bg-gray-200 p-2 rounded block">
              npm run process-efficiency -- data/results.json data/ast.json "model-name" 45000
            </code>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {efficiencyData.map((model, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">{model.llmModel}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tests:</span>
                    <span className="font-medium">{model.passedTests}/{model.totalTests}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pass Rate:</span>
                    <span className="font-medium">{((model.passedTests / model.totalTests) * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gen. Efficiency:</span>
                    <span className="font-medium">{(model.avgGenerationEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exec. Efficiency:</span>
                    <span className="font-medium">{(model.avgExecutionEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Gen. Time:</span>
                    <span className="font-medium">{Math.round(model.avgGenerationTime)}ms</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Actions:</span>
                    <span className="font-medium">{Math.round(model.avgActionsUsed)}</span>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Score:</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getEfficiencyColor(calculateOverallScore(model.avgGenerationEfficiency, model.avgExecutionEfficiency))}`}>
                        {calculateOverallScore(model.avgGenerationEfficiency, model.avgExecutionEfficiency)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Efficiency Chart */}
          {efficiencyData.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Efficiency Comparison</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formatChartData()}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="Generation Efficiency" fill="#3B82F6" />
                    <Bar dataKey="Execution Efficiency" fill="#10B981" />
                    <Bar dataKey="Pass Rate" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Efficiency Explanation */}
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <h4 className="font-semibold mb-3 text-gray-800">Efficiency Metrics Explanation:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <strong className="text-blue-600">Generation Efficiency:</strong> Measures the relationship between generation time and test success rate. Higher efficiency means faster generation with better pass rates.
              </div>
              <div>
                <strong className="text-green-600">Execution Efficiency:</strong> Measures the relationship between test success and the number of actions used. Higher efficiency means achieving more with fewer actions.
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <p><strong>Baseline:</strong> 30 seconds generation time, 5 actions per test. Efficiency calculated as (baseline / actual) × pass_rate for passed tests only.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
