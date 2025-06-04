import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    console.log("Loading summary data from MongoDB");
    
    const { searchParams } = new URL(request.url);
    const includeDetailed = searchParams.get('detailed') === 'true';
    const llmFilter = searchParams.get('llm');

    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db("tests");
    const summaryCollection = database.collection("summary");

    // Build query filter
    let query = {};
    if (llmFilter) {
      query = { LLM: llmFilter };
    }

    // Fetch data from the summary collection
    const summaryData = await summaryCollection.find(query).toArray();
    
    if (!summaryData || summaryData.length === 0) {
      console.log("Summary data not found in MongoDB");
      return NextResponse.json(
        { 
          error: "Summary data not found. Run the data processing and analysis pipeline first.",
          suggestion: "Execute: npm run process-data && npm run analyze-tests"
        }, 
        { status: 404 }
      );
    }
    
    console.log(`Retrieved ${summaryData.length} summary records`);
    
    // Ensure each record has an ID - this prevents "item.id is undefined" errors
    const processedData = summaryData.map((item, index) => {
      if (!item.id) {
        // Generate an ID if one doesn't exist using the filePath or a fallback
        item.id = item.filePath ? `summary_${item.filePath.replace(/[^a-zA-Z0-9]/g, '_')}` : `summary_record_${index}`;
      }
      return item;
    });

    // Calculate summary statistics
    const totalTests = processedData.reduce((sum, item) => sum + (item.totalTests || 0), 0);
    const totalPassed = processedData.reduce((sum, item) => sum + (item.passedTests || 0), 0);
    const totalFailed = processedData.reduce((sum, item) => sum + (item.failedTests || 0), 0);
    const uniqueLLMs = [...new Set(processedData.map(item => item.LLM))];
    
    // Prepare enhanced response data
    const responseData: any = {
      timestamp: new Date().toISOString(),
      reportDate: new Date().toISOString().split('T')[0],
      version: "1.0",
      summary: {
        totalRecords: processedData.length,
        totalTests: totalTests,
        totalPassed: totalPassed,
        totalFailed: totalFailed,
        overallPassRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) + '%' : '0%',
        uniqueLLMs: uniqueLLMs.length,
        llmList: uniqueLLMs
      },
      data: includeDetailed ? processedData : processedData.map(item => ({
        id: item.id,
        LLM: item.LLM,
        totalTests: item.totalTests,
        passedTests: item.passedTests,
        failedTests: item.failedTests,
        filePath: item.filePath
      })),
      insights: {
        topPerformingLLM: processedData.length > 0 ? 
          processedData.reduce((best, current) => {
            const currentRate = current.totalTests > 0 ? current.passedTests / current.totalTests : 0;
            const bestRate = best.totalTests > 0 ? best.passedTests / best.totalTests : 0;
            return currentRate > bestRate ? current : best;
          }).LLM : null,
        averageTestsPerLLM: uniqueLLMs.length > 0 ? 
          (totalTests / uniqueLLMs.length).toFixed(1) : '0',
        dataCompleteness: (processedData.filter(item => 
          item.LLM && item.totalTests !== undefined
        ).length / Math.max(processedData.length, 1) * 100).toFixed(1) + '%'
      }
    };

    // Add methodology explanation for summary data
    responseData.methodology = {
      description: "LLM Test Summary Data Collection and Analysis System",
      version: "1.0",
      dataAggregation: {
        title: "Summary Data Organization",
        description: "Comprehensive aggregation of test execution results across multiple Large Language Models (LLMs) and test suites.",
        process: {
          dataCollection: {
            purpose: "Gather test execution results from various LLM implementations",
            scope: "All test files and scenarios executed across different LLM providers",
            validation: "Automatic validation of test result completeness and accuracy"
          },
          resultAggregation: {
            purpose: "Combine individual test results into meaningful summary statistics",
            metrics: ["Total tests executed", "Passed tests count", "Failed tests count", "Pass rate percentage"],
            granularity: "Per-LLM and overall aggregated statistics"
          },
          qualityAssurance: {
            purpose: "Ensure data integrity and consistency across all collected results",
            techniques: ["Unique ID generation", "Data completeness validation", "Cross-reference verification"],
            reliability: "Robust error handling and data recovery mechanisms"
          }
        }
      },
      analysisMetrics: {
        performanceIndicators: {
          passRate: "Percentage of successful test executions (passed/total)",
          testCoverage: "Number of unique test scenarios covered per LLM",
          consistency: "Variance in performance across different test types"
        },
        comparativeAnalysis: {
          llmRanking: "Relative performance ranking based on pass rates",
          strengthsIdentification: "Areas where specific LLMs excel",
          weaknessesIdentification: "Common failure patterns across LLMs"
        },
        dataQuality: {
          completeness: "Percentage of records with all required fields",
          uniqueness: "All records have unique identifiers",
          consistency: "Standardized data format across all entries"
        }
      },
      usageGuidelines: {
        apiEndpoints: {
          basic: "GET /api/summary - Returns processed summary data with insights",
          detailed: "GET /api/summary?detailed=true - Includes full test details",
          filtered: "GET /api/summary?llm={llm_name} - Filter results by specific LLM"
        },
        bestPractices: [
          "Regular data refresh to maintain current performance metrics",
          "Cross-validation with detailed test results for accuracy",
          "Monitor data completeness metrics for quality assurance"
        ],
        interpretation: {
          passRates: "Higher percentages indicate better LLM performance",
          testCounts: "More tests provide better statistical significance",
          consistency: "Lower variance indicates more reliable performance"
        }
      }
    };
    
    console.log(`Analysis complete: ${uniqueLLMs.length} LLMs, ${totalTests} total tests, ${responseData.summary.overallPassRate} pass rate`);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching summary data:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch summary data",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}