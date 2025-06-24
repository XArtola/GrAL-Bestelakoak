"use client";
import Image from "next/image";
import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TestGenerationTimingView from './components/TestGenerationTimingView';
import ActionUsageComparisonView from './components/ActionUsageComparisonView';


export default function Home() {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"add" | "test-generation" | "action-usage">("add");
  const [resultsTab, setResultsTab] = useState<"original" | "summary">("summary");
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<'tests'|'passed'|'failed'|'skipped'|'pending'|'other'>('passed');
  const [expandedItem, setExpandedItem] = useState<any>(null);  const [llmTestData, setLlmTestData] = useState<any>(null);
  const [llmTestsLoading, setLlmTestsLoading] = useState(false);
    // Cache busting - force browser to load latest version (client-side only)
  const [cacheBuster, setCacheBuster] = useState<number | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(process.env.NODE_ENV === 'development');

  // Set cache buster only on client side to avoid hydration mismatch
  useEffect(() => {
    setCacheBuster(Date.now());
  }, []);
  
  // Load persisted view state on component mount
  useEffect(() => {
    const savedView = localStorage.getItem('dashboard-view');
    const savedResultsTab = localStorage.getItem('dashboard-results-tab');
    const savedSortCriteria = localStorage.getItem('dashboard-sort-criteria');    if (savedView && ['add', 'test-generation', 'action-usage'].includes(savedView)) {
      setView(savedView as "add" | "test-generation" | "action-usage");
    }
    
    if (savedResultsTab && ['original', 'summary'].includes(savedResultsTab)) {
      setResultsTab(savedResultsTab as "original" | "summary");
    }
    
    if (savedSortCriteria && ['tests', 'passed', 'failed', 'skipped', 'pending', 'other'].includes(savedSortCriteria)) {
      setSortCriteria(savedSortCriteria as 'tests'|'passed'|'failed'|'skipped'|'pending'|'other');
    }
  }, []);

  // Persist view state whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard-view', view);
  }, [view]);

  // Persist results tab whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard-results-tab', resultsTab);
  }, [resultsTab]);

  // Persist sort criteria whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard-sort-criteria', sortCriteria);
  }, [sortCriteria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    
    setIsLoading(true);
    setStatus("Cloning repository...");
    
    try {
      const response = await fetch("/api/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: link }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to clone repository");
      }
      
      setStatus("Success: " + data.message);
    } catch (error: any) {
      setStatus("Error: " + (error.message || "An error occurred"));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    // No LLM test data fetching needed
  }, [view]);

  // prepare sorted data and chart mapping
  const sortedData = [...resultsData]
    .filter(item => item && item.results && item.results.summary) // Filter out any invalid items
    .sort(
      (a, b) => (b.results.summary as any)[sortCriteria] - (a.results.summary as any)[sortCriteria]
    );
    
  const chartData = sortedData.map((item) => {
    if (!item || !item.id) {
      console.warn("Skipping item with undefined id:", item);
      return null;
    }
    // Add version if version > 1
    let label = item.LLM || `Model-${item.id.replace(/^results/i, '')}`;
    if (item.version && Number(item.version) > 1) {
      label += ` V${item.version}`;
    }
    return {
      name: label,
      Tests: item.results.summary.tests,
      Passed: item.results.summary.passed,
      Failed: item.results.summary.failed,
      Skipped: item.results.summary.skipped,
      Pending: item.results.summary.pending,
    };
  }).filter(Boolean);

  const handleBarClick = (e: any) => {
    if (!e || !e.payload || !e.payload.name) return;
    const name = e.payload.name;
    // Find the item by matching the LLM name and version label
    const item = resultsData.find((r) => {
      let label = r.LLM || `Model-${r.id.replace(/^results/i, '')}`;
      if (r.version && Number(r.version) > 1) {
        label += ` V${r.version}`;
      }
      return label === name;
    });
    if (item) setExpandedItem(item);
  };

  // aggregate results grouped by file path, then by test name and run attempts
  const aggregatedByFile = useMemo(() => {
    const fileMap = new Map();
    resultsData.forEach((item) => {
        if (!item.id) {
            console.warn("Skipping item with undefined id:", item);
            return;
        }
        // Use LLM field and version for display
        let displayName = item.LLM || `Model-${item.id.replace(/^results/i, '')}`;
        if (item.version && Number(item.version) > 1) {
          displayName += ` V${item.version}`;
        }
        if (item.results && Array.isArray(item.results.tests)) {
            item.results.tests.forEach((test: { filePath: string; name: string; status: string; duration: number }) => {
                if (!test.filePath) {
                    console.warn("Skipping test with undefined filePath:", test);
                    return;
                }
                const testsMap = fileMap.get(test.filePath) || new Map();
                const runGroups = testsMap.get(test.name) || new Map();
                const attempts = runGroups.get(displayName) || [];
                attempts.push({ status: test.status, duration: test.duration });
                runGroups.set(displayName, attempts);
                testsMap.set(test.name, runGroups);
                fileMap.set(test.filePath, testsMap);
            });
        } else {
            console.warn("Skipping item with invalid or missing results.tests:", item);
        }
    });
    return fileMap;
}, [resultsData]);

  console.log("Aggregated data by file:", aggregatedByFile); // Debugging log

  // Group results by LLM and Version, with test counts per file
  const resultsByLLMVersion = useMemo(() => {
    const lmmVersionMap = new Map<string, { files: Map<string, { total: number; passed: number }> }>();

    resultsData.forEach((item) => {
      if (!item || !item.id || !item.results || !Array.isArray(item.results.tests)) {
        console.warn("Skipping item due to missing data:", item);
        return;
      }

      // Create a unique key for LLM and version
      let key = item.LLM || `Model-${item.id.replace(/^results/i, '')}`;
      if (item.version && Number(item.version) > 1) {
        key += ` V${item.version}`;
      }

      // Initialize or get existing data for this LLM/Version
      const existingData = lmmVersionMap.get(key) || { files: new Map<string, { total: number; passed: number }>() };
      
      // Group tests by file path and count total/passed tests
      item.results.tests.forEach((test: { filePath: string; status: string }) => {
        if (!test.filePath) {
          console.warn("Skipping test with undefined filePath:", test);
          return;
        }
        
        const fileStats = existingData.files.get(test.filePath) || { total: 0, passed: 0 };
        fileStats.total += 1;
        if (test.status === 'passed') {
          fileStats.passed += 1;
        }
        existingData.files.set(test.filePath, fileStats);
      });

      lmmVersionMap.set(key, existingData);
    });

    return lmmVersionMap;
  }, [resultsData]);
  return (
    <div className="min-h-screen flex bg-black text-white">      {/* Modern Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700/50 min-h-screen sticky top-0 shadow-2xl sidebar-glow custom-scrollbar overflow-y-auto">
        {/* Logo/Brand Section */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                LLM Dashboard
              </h1>
              <p className="text-xs text-gray-400">Testing Suite</p>
            </div>
          </div>
        </div>        {/* Navigation Menu */}
        <nav className="p-4 space-y-2" data-cache-buster={cacheBuster || 'loading'}>
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              Main Navigation
            </h2>
              {/* Add Project Button */}
            <button 
              onClick={() => setView("add")} 
              className={`nav-button group w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                view === "add" 
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10" 
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors ${
                view === "add" 
                  ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg" 
                  : "bg-gray-700 group-hover:bg-gray-600"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium">Add Project</span>
              {view === "add" && (
                <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              )}
            </button>            {/* Test Generation Timing Button */}
            <button 
              onClick={() => setView("test-generation")} 
              className={`nav-button group w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                view === "test-generation" 
                  ? "bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/10" 
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors ${
                view === "test-generation" 
                  ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg" 
                  : "bg-gray-700 group-hover:bg-gray-600"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium">Test Generation Timing</span>
              {view === "test-generation" && (
                <div className="ml-auto w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              )}
            </button>            {/* Action Usage Analysis Button */}
            <button 
              onClick={() => setView("action-usage")} 
              className={`nav-button group w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                view === "action-usage" 
                  ? "bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-500/10" 
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors ${
                view === "action-usage" 
                  ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg" 
                  : "bg-gray-700 group-hover:bg-gray-600"
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="font-medium">Action Usage Analysis</span>
              {view === "action-usage" && (
                <div className="ml-auto w-2 h-2 bg-rose-400 rounded-full animate-pulse" />              )}
            </button>
          </div>

          {/* Status/Info Section */}
          <div className="pt-4 border-t border-gray-700/50">
            <div className="px-3 py-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Status</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700/50">
          <div className="text-xs text-gray-500 text-center">
            <p>Dashboard v1.0</p>
            <p className="mt-1">© 2025 LLM Testing</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-8 sm:p-20 pb-20 flex flex-col items-center">
        <main className="flex flex-col gap-[32px] w-full max-w-6xl items-center sm:items-start">
          {view === "add" ? (
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Enter GitHub repository URL"
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:bg-blue-600 transition-colors disabled:bg-blue-300"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Clone Repository"}
              </button>
              {status && (
                <div
                  className={`mt-4 p-4 rounded-md ${
                    status.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {status}
                </div>
              )}
            </form>
          ) : view === "test-generation" ? (
            <div className="w-full max-w-6xl">
              <h1 className="text-2xl font-bold mb-6">Test Generation Timing Analysis</h1>
              <TestGenerationTimingView />
            </div>          ) : view === "action-usage" ? (            <div className="w-full max-w-6xl">
              <h1 className="text-2xl font-bold mb-6">Action Usage Comparison</h1>
              <ActionUsageComparisonView />
            </div>
          ) : null}
        </main>
          <footer className="flex gap-[24px] flex-wrap items-center justify-center mt-8">
          <div className="text-center text-sm text-gray-400">
            <p>LLM Testing Dashboard - Analyze and compare LLM performance</p>
            <p className="mt-1">Built for TFG research project</p>
          </div>
        </footer>
        
        {expandedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={() => setExpandedItem(null)}>
            <div className="bg-gray-900 text-white p-6 rounded max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-semibold mb-4">Details for {(expandedItem.LLM || `Model-${expandedItem.id.replace(/^results/i, '')}`) + (expandedItem.version && Number(expandedItem.version) > 1 ? ` V${expandedItem.version}` : '')}</h2>
              <dl className="text-sm mb-4">
                <dt className="font-medium">Tool:</dt>
                <dd className="mb-2">{expandedItem.results.tool.name}</dd>
                {Object.entries(expandedItem.results.summary).map(([key, val]) => (
                  <div key={key} className="flex justify-between mb-1">
                    <span className="capitalize">{key}:</span>
                    <span>{String(val)}</span>
                  </div>
                ))}
              </dl>
              <div className="overflow-auto max-h-64 mb-4">
                <table className="table-auto w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border-b text-left">File</th>
                      <th className="px-2 py-1 border-b text-left">Test Name</th>
                      <th className="px-2 py-1 border-b text-left">Status</th>
                      <th className="px-2 py-1 border-b text-left">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expandedItem.results.tests.map((t: any, idx: number) => (
                      <tr key={idx} className="even:bg-gray-800">
                        <td className="px-2 py-1 align-top text-left">{t.filePath}</td>
                        <td className="px-2 py-1 align-top text-left">{t.name}</td>
                        <td className="px-2 py-1 align-top capitalize text-left">{t.status}</td>
                        <td className="px-2 py-1 align-top text-left">{t.duration}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setExpandedItem(null)} className="mt-2 px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600 rounded transition-colors">
                Close
              </button>
            </div>
          </div>        )}
      </div>      {/* Debug Panel for Development */}
      {showDebugPanel && (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-gray-300 z-50 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-blue-400">Development Debug</span>
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>          <div className="space-y-1">
            <div>Build: {cacheBuster || 'Loading...'}</div>
            <div>Active Section: <span className="text-green-400">{view}</span></div>
            <div>Navigation Loaded: <span className="text-green-400">✓</span></div>
            <div>Results Count: {resultsData.length}</div>
            <div className="text-xs text-gray-500 mt-2">
              Development mode - this panel is hidden in production
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 w-full"
            >
              Force Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
