"use client";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"add" | "results">("add");
  const [resultsTab, setResultsTab] = useState<"original" | "summary">("summary");
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<'tests'|'passed'|'failed'|'skipped'|'pending'|'other'>('passed');
  const [expandedItem, setExpandedItem] = useState<any>(null);

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
    if (view === "results") {
      setResultsLoading(true);
      fetch("/api/results")
        .then((res) => res.json())
        .then((data) => {
          console.log("Fetched results data:", data); // Debugging log
          setResultsData(data);
        })
        .catch((error) => {
          console.error("Error fetching results:", error); // Debugging log
          setResultsData([]);
        })
        .finally(() => setResultsLoading(false));
      
      // Fetch summary data
      setSummaryLoading(true);
      fetch("/api/summary")
        .then((res) => res.json())
        .then((data) => {
          console.log("Fetched summary data:", data); // Debugging log
          setSummaryData(data);
        })
        .catch((error) => {
          console.error("Error fetching summary data:", error); // Debugging log
          setSummaryData([]);
        })
        .finally(() => setSummaryLoading(false));
    }
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
    <div className="min-h-screen flex bg-black text-white">
      {/* Sidebar */}
      <aside className="w-48 flex flex-col items-center py-8 bg-gray-900 border-r border-gray-800 min-h-screen sticky top-0">
        <div className="flex flex-col gap-4 w-full">
          <button onClick={() => setView("add")} className={`w-full px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600 transition-colors ${view === "add" ? "" : "opacity-80"}`}>Add project</button>
          <button onClick={() => setView("results")} className={`w-full px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600 transition-colors ${view === "results" ? "" : "opacity-80"}`}>See results</button>
        </div>
      </aside>
      {/* Main content */}
      <div className="flex-1 p-8 sm:p-20 pb-20 flex flex-col items-center">
        <main className="flex flex-col gap-[32px] w-full max-w-6xl items-center sm:items-start">
          {/* Conditional content */}
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
                <div className={`mt-4 p-4 rounded-md ${
                  status.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                }`}
                >
                  {status}
                </div>
              )}
            </form>
          ) : (
            <div className="w-full max-w-6xl">
              {/* Sorting selector and chart */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Sort by:</label>
                <select
                  value={sortCriteria}
                  onChange={(e) => setSortCriteria(e.target.value as any)}
                  className="border rounded px-2 py-1 bg-black text-white"
                >
                  {['tests','passed','failed','skipped','pending','other'].map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full h-96 mb-4"> {/* Increased height for better label visibility */}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 40, right: 40, bottom: 40 }}>
                    <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 14, fill: '#fff' }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Passed" fill="#4CAF50" cursor="pointer" onClick={handleBarClick} />
                    <Bar dataKey="Failed" fill="#F44336" cursor="pointer" onClick={handleBarClick} />
                    <Bar dataKey="Skipped" fill="#FFC107" cursor="pointer" onClick={handleBarClick} />
                    <Bar dataKey="Pending" fill="#2196F3" cursor="pointer" onClick={handleBarClick} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mb-4">
                <button onClick={() => setResultsTab("original")} className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600 transition-colors ${resultsTab === "original" ? "" : "opacity-80"}`}>Original Results</button>
                <button onClick={() => setResultsTab("summary")} className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600 transition-colors ${resultsTab === "summary" ? "" : "opacity-80"}`}>Summary Data</button>
              </div>
              {resultsTab === "original" ? (
                <>
                  {resultsLoading ? (
                    <p>Loading results...</p>
                  ) : resultsData.length > 0 ? (
                    <>
                      <h2 className="text-xl font-bold mb-4">Results by LLM and Version</h2>
                      {Array.from(resultsByLLMVersion.entries()).map(([llmVersionKey, data]) => (
                        <section key={llmVersionKey} className="mb-8 p-4 border border-gray-700 rounded-lg">
                          <h3 className="text-lg font-semibold mb-4">{llmVersionKey}</h3>
                          {data.files.size > 0 ? (
                            <table className="table-auto w-full text-sm border-collapse">
                              <thead>
                                <tr>
                                  <th className="px-2 py-1 border-b border-gray-700 text-left">File Path</th>
                                  <th className="px-2 py-1 border-b border-gray-700 text-right">Tests Passed</th>
                                  <th className="px-2 py-1 border-b border-gray-700 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from(data.files.entries()).map(([filePath, stats]) => {
                                  const isPassing = stats.passed === stats.total;
                                  return (
                                    <tr key={filePath} className="even:bg-gray-800">
                                      <td className="px-2 py-1 align-top text-left">{filePath}</td>
                                      <td className="px-2 py-1 align-top text-right">{stats.passed}/{stats.total}</td>
                                      <td className={`px-2 py-1 align-top text-right font-semibold ${isPassing ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPassing ? 'Pass' : 'Fail'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-yellow-400">No test data found for this LLM/Version.</p>
                          )}
                        </section>
                      ))}
                    </>
                  ) : (
                    <p>No results found.</p>
                  )}
                </>
              ) : (
                <>
                  {summaryLoading ? (
                    <div className="mt-8">
                      <h2 className="text-xl font-bold mb-4">Summary Data</h2>
                      <p>Loading summary data...</p>
                    </div>
                  ) : summaryData.length > 0 ? (
                    <div className="mt-8">
                      <h2 className="text-xl font-bold mb-4">Summary Data</h2>
                      {summaryData.map((summary, index) => (
                        <section key={index} className="mb-8 p-4 border border-gray-700 rounded-lg">
                          <h3 className="text-lg font-semibold mb-4">File: {summary.filePath}</h3>
                          {summary.tests && summary.tests.length > 0 ? (
                            summary.tests.map((test: { name: string; attempts: any[] }, testIndex: number) => (
                              <div key={testIndex} className="mb-6 p-3 bg-gray-900 rounded">
                                <h4 className="font-medium mb-2">Test: {test.name}</h4>
                                {test.attempts && test.attempts.length > 0 ? (
                                  <table className="table-auto w-full text-sm border-collapse">
                                    <thead>
                                      <tr>
                                        <th className="px-2 py-1 border-b border-gray-700 text-left">LLM</th>
                                        <th className="px-2 py-1 border-b border-gray-700 text-left">Version</th>
                                        <th className="px-2 py-1 border-b border-gray-700 text-left">Status</th>
                                        <th className="px-2 py-1 border-b border-gray-700 text-left">Duration (ms)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {test.attempts.map((attempt, attemptIndex) => (
                                        attempt.results && attempt.results.length > 0 ? (
                                          attempt.results.map((result: { status: string; duration: number }, resultIndex: number) => (
                                            <tr key={`${attemptIndex}-${resultIndex}`} className="even:bg-gray-800">
                                              <td className="px-2 py-1 align-top text-left">{attempt.LLM}</td>
                                              <td className="px-2 py-1 align-top text-left">{attempt.version}</td>
                                              <td className="px-2 py-1 align-top capitalize text-left">{result.status}</td>
                                              <td className="px-2 py-1 align-top text-left">{result.duration}</td>
                                            </tr>
                                          ))
                                        ) : (
                                          <tr key={attemptIndex} className="even:bg-gray-800">
                                            <td className="px-2 py-1 align-top text-left">{attempt.LLM}</td>
                                            <td className="px-2 py-1 align-top text-left">{attempt.version}</td>
                                            <td className="px-2 py-1 align-top text-left" colSpan={2}>No results available</td>
                                          </tr>
                                        )
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-yellow-400">No attempt data available for this test</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-gray-800 rounded">
                              <p className="text-yellow-400">No test data found for this file path.</p>
                            </div>
                          )}
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-8">
                      <h2 className="text-xl font-bold mb-4">Summary Data</h2>
                      <p>No summary data found.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
        <footer className="flex gap-[24px] flex-wrap items-center justify-center mt-8">
          
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
          </div>
        )}
      </div>
    </div>
  );
}
