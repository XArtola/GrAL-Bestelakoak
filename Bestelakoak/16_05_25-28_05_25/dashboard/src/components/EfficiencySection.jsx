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

  if (loading) {
    return (
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem' }}>LLM Efficiency Metrics</h2>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '10rem' }}>
          <div style={{ animation: 'spin 1s linear infinite', borderRadius: '50%', height: '2rem', width: '2rem', borderBottom: '2px solid #3b82f6' }}></div>
          <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>Loading efficiency data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem' }}>LLM Efficiency Metrics</h2>
        <div style={{ textAlign: 'center', color: '#ef4444', padding: '2rem 0' }}>
          <p>Error loading efficiency data: {error}</p>
          <button 
            onClick={loadEfficiencyData}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>LLM Efficiency Metrics</h2>
        <button 
          onClick={loadEfficiencyData}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {efficiencyData.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>No efficiency data available</p>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
            Upload test results using the process-efficiency script to see metrics.
          </p>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>To add data, run:</p>
            <code style={{ fontSize: '0.75rem', backgroundColor: '#e5e7eb', padding: '0.5rem', borderRadius: '0.25rem', display: 'block' }}>
              npm run process-efficiency -- data/resultsOriginal.json data/test-efficiency-metrics_original_ast.json "cypress-original" 45000
            </code>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {efficiencyData.map((model, index) => (
              <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#111827' }}>
                  {model.llmModel}
                </h3>
                
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#6b7280' }}>Tests:</span>
                    <span style={{ fontWeight: '500' }}>{model.passedTests}/{model.totalTests}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#6b7280' }}>Pass Rate:</span>
                    <span style={{ fontWeight: '500' }}>{((model.passedTests / model.totalTests) * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#6b7280' }}>Gen. Efficiency:</span>
                    <span style={{ fontWeight: '500' }}>{(model.avgGenerationEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#6b7280' }}>Exec. Efficiency:</span>
                    <span style={{ fontWeight: '500' }}>{(model.avgExecutionEfficiency * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Overall Score:</span>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '0.375rem', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        backgroundColor: calculateOverallScore(model.avgGenerationEfficiency, model.avgExecutionEfficiency) >= 80 ? '#dcfce7' : calculateOverallScore(model.avgGenerationEfficiency, model.avgExecutionEfficiency) >= 60 ? '#fef3c7' : '#fee2e2',
                        color: calculateOverallScore(model.avgGenerationEfficiency, model.avgExecutionEfficiency) >= 80 ? '#166534' : calculateOverallScore(model.avgGenerationEfficiency, model.avgExecutionEfficiency) >= 60 ? '#92400e' : '#991b1b'
                      }}>
                        {calculateOverallScore(model.avgGenerationEfficiency, model.avgExecutionEfficiency)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#111827' }}>
              Efficiency Metrics Explanation:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', fontSize: '0.875rem', color: '#374151' }}>
              <div>
                <strong style={{ color: '#2563eb' }}>Generation Efficiency:</strong> Measures the relationship between generation time and test success rate.
              </div>
              <div>
                <strong style={{ color: '#059669' }}>Execution Efficiency:</strong> Measures the relationship between test success and the number of actions used.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
