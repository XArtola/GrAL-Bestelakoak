"use client";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"add" | "results">("add");
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
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
    }
  }, [view]);

  // prepare sorted data and chart mapping
  const sortedData = [...resultsData].sort(
    (a, b) => (b.results.summary as any)[sortCriteria] - (a.results.summary as any)[sortCriteria]
  );
  const chartData = sortedData.map((item) => ({
    name: item.id.replace(/^results/i, ''),
    Tests: item.results.summary.tests,
    Passed: item.results.summary.passed,
    Failed: item.results.summary.failed,
    Skipped: item.results.summary.skipped,
    Pending: item.results.summary.pending,
  }));

  const handleBarClick = (e: any) => {
    const name = e.payload.name;
    const item = resultsData.find((r) => r.id === name);
    if (item) setExpandedItem(item);
  };

  // aggregate results grouped by file path, then by test name and run attempts
  const aggregatedByFile = useMemo(() => {
    const fileMap = new Map<string, Map<string, Map<string, {status: string; duration: number;}[]>>>();
    resultsData.forEach((item) => {
      const runName = item.id.replace(/^results/i, '');
      item.results.tests.forEach((test: any) => {
        const testsMap = fileMap.get(test.filePath) || new Map();
        const runGroups = testsMap.get(test.name) || new Map();
        const attempts = runGroups.get(runName) || [];
        attempts.push({ status: test.status, duration: test.duration });
        runGroups.set(runName, attempts);
        testsMap.set(test.name, runGroups);
        fileMap.set(test.filePath, testsMap);
      });
    });
    return fileMap;
  }, [resultsData]);

  console.log("Aggregated data by file:", aggregatedByFile); // Debugging log

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-black text-white">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        {/* Menu Tabs */}
        <div className="flex gap-4 mb-4">
          <button onClick={() => setView("add")} className={`px-4 py-2 rounded ${view === "add" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>Add project</button>
          <button onClick={() => setView("results")} className={`px-4 py-2 rounded ${view === "results" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>See results</button>
        </div>

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
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
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
          <div className="w-full max-w-4xl">
            {/* Sorting selector and chart */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Sort by:</label>
              <select
                value={sortCriteria}
                onChange={(e) => setSortCriteria(e.target.value as any)}
                className="border rounded px-2 py-1"
              >
                {['tests','passed','failed','skipped','pending','other'].map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
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
            {Array.from(aggregatedByFile.entries()).map(([filePath, testsMap]) => (
              <section key={filePath} className="mb-8">
                <h3 className="text-lg font-semibold mb-4">File: {filePath}</h3>
                {Array.from(testsMap.entries()).map(([testName, runGroups]) => (
                  <div key={testName} className="mb-6">
                    <h4 className="font-medium mb-2">Test: {testName}</h4>
                    <table className="table-auto w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 border-b">Testing File</th>
                          <th className="px-2 py-1 border-b">Status</th>
                          <th className="px-2 py-1 border-b">Fail Message</th>
                          <th className="px-2 py-1 border-b">Duration (ms)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(runGroups.entries()).map(([runName, attempts]) => (
                          <tr key={runName} className="even:bg-gray-800">
                            <td className="px-2 py-1">{runName}</td>
                            <td className="px-2 py-1 capitalize">{attempts[0].status}</td>
                            <td className="px-2 py-1">{attempts[0].status === 'failed' ? attempts[0].message : 'N/A'}</td>
                            <td className="px-2 py-1">{attempts[0].duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            ))}
            {resultsLoading ? (
              <p>Loading results...</p>
            ) : resultsData.length > 0 ? (
              resultsData.map((item, i) => (
                <div key={i} className="p-4 border rounded mb-4">
                  <h3 className="text-lg font-semibold mb-1">{item.id.replace(/^results/i, '')}</h3>
                  <p className="text-sm">Tool: {item.results.tool.name}</p>
                  <div className="flex flex-wrap gap-4 text-sm mt-1">
                    <span>Tests: {item.results.summary.tests}</span>
                    <span>Passed: {item.results.summary.passed}</span>
                    <span>Failed: {item.results.summary.failed}</span>
                    <span>Skipped: {item.results.summary.skipped}</span>
                    <span>Pending: {item.results.summary.pending}</span>
                    <span>Other: {item.results.summary.other}</span>
                    <span>Start: {new Date(item.results.summary.start).toLocaleString()}</span>
                    <span>Stop: {new Date(item.results.summary.stop).toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p>No results found.</p>
            )}
          </div>
        )}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        
      </footer>
      {expandedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={() => setExpandedItem(null)}>
          <div className="bg-gray-900 text-white p-6 rounded max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Details for {expandedItem.id.replace(/^results/i, '')}</h2>
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
                    <th className="px-2 py-1 border-b">File</th>
                    <th className="px-2 py-1 border-b">Test Name</th>
                    <th className="px-2 py-1 border-b">Status</th>
                    <th className="px-2 py-1 border-b">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {expandedItem.results.tests.map((t: any, idx: number) => (
                    <tr key={idx} className="even:bg-gray-800">
                      <td className="px-2 py-1 align-top">{t.filePath}</td>
                      <td className="px-2 py-1 align-top">{t.name}</td>
                      <td className="px-2 py-1 align-top capitalize">{t.status}</td>
                      <td className="px-2 py-1 align-top">{t.duration}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setExpandedItem(null)} className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
