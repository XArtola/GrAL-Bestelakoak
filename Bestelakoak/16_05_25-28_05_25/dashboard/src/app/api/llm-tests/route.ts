import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Define types for our data structures
interface TestResult {
  testName: string;
  status: string;
  executionTime: number;
  generationTime: number;
  filePath?: string;
}

interface LlmTestData {
  llmName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  tests: TestResult[];
}

interface TestComparison {
  llms: string[];
  testNames: string[];
  testData: LlmTestData[];
}

export async function GET(request: Request) {
  try {
    console.log("Loading LLM test comparison data from MongoDB");
    
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get('metrics') === 'true';
    const llmFilter = searchParams.get('llm');
    
    // Connect to MongoDB
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGODB_DB_NAME || 'tests');
    
    // Get collections
    const summaryCollection = db.collection(process.env.MONGODB_COLLECTION_SUMMARY || 'summary');
    
    // Build query filter
    let query = {};
    if (llmFilter) {
      query = { LLM: llmFilter };
    }
    
    // Retrieve summary data (array of LLM objects)
    const llmSummaries = await summaryCollection.find(query).toArray();
    
    if (!llmSummaries || llmSummaries.length === 0) {
      console.log("Summary data not found in MongoDB. Database might be empty.");
      return NextResponse.json(
        { 
          error: "Test data not found. Run the data processing script first.",
          suggestion: "Execute: npm run process-tests && npm run save-to-database"
        }, 
        { status: 404 }
      );
    }
    
    // Extract unique LLM names and test names from the summaries
    const llms = llmSummaries.map((summary: any) => summary.LLM);
    const testNamesSet = new Set<string>();
    
    // Collect all unique test names across all LLMs
    llmSummaries.forEach((summary: any) => {
      if (summary.tests && Array.isArray(summary.tests)) {
        summary.tests.forEach((test: any) => {
          if (test.name) {
            testNamesSet.add(test.name);
          }
        });
      }
    });
    
    const testNames = Array.from(testNamesSet);
    
    // Structure test data by LLM using the new format
    const testData = llmSummaries.map((llmSummary: any) => {
      return {
        llmName: llmSummary.LLM,
        totalTests: llmSummary.totalTests,
        passedTests: llmSummary.passedTests,
        failedTests: llmSummary.failedTests,
        tests: (llmSummary.tests || []).map((test: any) => ({
          testName: test.name,
          status: test.status,
          executionTime: test.executionTime,
          generationTime: test.generationTime,
          filePath: test.filePath
        }))
      };
    });

    // Calculate comprehensive metrics
    const totalTests = testData.reduce((sum, llm) => sum + llm.totalTests, 0);
    const totalPassed = testData.reduce((sum, llm) => sum + llm.passedTests, 0);
    const totalFailed = testData.reduce((sum, llm) => sum + llm.failedTests, 0);
    
    // Construct the enhanced response
    const responseData: any = {
      timestamp: new Date().toISOString(),
      reportDate: new Date().toISOString().split('T')[0],
      version: "1.0",
      summary: {
        totalLLMs: llms.length,
        totalUniqueTests: testNames.length,
        totalTestExecutions: totalTests,
        totalPassed: totalPassed,
        totalFailed: totalFailed,
        overallPassRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) + '%' : '0%'
      },
      testComparison: {
        llms,
        testNames,
        testData
      },
      insights: {
        topPerformingLLM: testData.length > 0 ? 
          testData.reduce((best, current) => {
            const currentRate = current.totalTests > 0 ? current.passedTests / current.totalTests : 0;
            const bestRate = best.totalTests > 0 ? best.passedTests / best.totalTests : 0;
            return currentRate > bestRate ? current : best;
          }).llmName : null,        mostChallenging: testNames.length > 0 ? (() => {
          const testFailures = testNames.map(testName => {
            const failures = testData.reduce((count, llm) => {
              const test = llm.tests.find((t: TestResult) => t.testName === testName);
              return count + (test && test.status === 'failed' ? 1 : 0);
            }, 0);
            return { testName, failures, failureRate: (failures / llms.length * 100).toFixed(1) + '%' };
          });
          return testFailures.sort((a, b) => b.failures - a.failures)[0];
        })() : null,
        averageExecutionTime: (() => {
          const allTests = testData.flatMap(llm => llm.tests);
          const totalTime = allTests.reduce((sum, test) => sum + (test.executionTime || 0), 0);
          return allTests.length > 0 ? (totalTime / allTests.length).toFixed(2) + 's' : '0s';
        })(),
        averageGenerationTime: (() => {
          const allTests = testData.flatMap(llm => llm.tests);
          const totalTime = allTests.reduce((sum, test) => sum + (test.generationTime || 0), 0);
          return allTests.length > 0 ? (totalTime / allTests.length).toFixed(2) + 's' : '0s';
        })()
      }
    };

    // Include detailed metrics only if requested
    if (includeMetrics) {
      responseData.detailedMetrics = {
        llmPerformanceBreakdown: testData.map(llm => ({
          llmName: llm.llmName,
          passRate: llm.totalTests > 0 ? ((llm.passedTests / llm.totalTests) * 100).toFixed(1) + '%' : '0%',          avgExecutionTime: llm.tests.length > 0 ? 
            (llm.tests.reduce((sum: number, test: TestResult) => sum + (test.executionTime || 0), 0) / llm.tests.length).toFixed(2) + 's' : '0s',
          avgGenerationTime: llm.tests.length > 0 ? 
            (llm.tests.reduce((sum: number, test: TestResult) => sum + (test.generationTime || 0), 0) / llm.tests.length).toFixed(2) + 's' : '0s'
        })),
        testComplexityAnalysis: testNames.map(testName => {          const testResults = testData.map(llm => {
            const test = llm.tests.find((t: TestResult) => t.testName === testName);
            return test ? { 
              llm: llm.llmName, 
              status: test.status, 
              executionTime: test.executionTime || 0,
              generationTime: test.generationTime || 0
            } : null;
          }).filter(Boolean);
          
          const passCount = testResults.filter(r => r?.status === 'passed').length;
          return {
            testName,
            passRate: testResults.length > 0 ? ((passCount / testResults.length) * 100).toFixed(1) + '%' : '0%',
            avgExecutionTime: testResults.length > 0 ? 
              (testResults.reduce((sum, r) => sum + (r?.executionTime || 0), 0) / testResults.length).toFixed(2) + 's' : '0s'
          };
        })
      };
    }

    // Add methodology explanation for LLM test comparison
    responseData.methodology = {
      description: "Large Language Model Test Comparison and Analysis Framework",
      version: "1.0",
      comparisonFramework: {
        title: "LLM Performance Comparison Methodology",
        description: "Systematic approach to evaluate and compare the effectiveness of different Large Language Models across standardized test suites.",
        components: {
          testStandardization: {
            purpose: "Ensure fair and consistent evaluation across all LLMs",
            approach: "Identical test scenarios executed across all models",
            criteria: ["Same test inputs", "Standardized execution environment", "Consistent success/failure definitions"]
          },
          performanceMetrics: {
            primary: {
              passRate: "Percentage of successfully completed tests",
              executionTime: "Time taken to execute generated test code",
              generationTime: "Time taken by LLM to generate test code"
            },
            derived: {
              efficiency: "Balance between speed and accuracy",
              reliability: "Consistency across multiple test runs",
              complexity_handling: "Performance on tests of varying difficulty"
            }
          },
          comparativeAnalysis: {
            purpose: "Identify strengths and weaknesses of each LLM",
            techniques: ["Cross-model comparison", "Test complexity analysis", "Performance trend identification"],
            insights: ["Best-performing models", "Most challenging test scenarios", "Optimization opportunities"]
          }
        }
      },
      dataInterpretation: {
        performanceIndicators: {
          excellent: "> 90% pass rate with reasonable execution times",
          good: "70-90% pass rate with acceptable performance",
          fair: "50-70% pass rate with mixed results",
          poor: "< 50% pass rate with significant issues"
        },
        timingAnalysis: {
          generationTime: "Time for LLM to produce test code (lower is better)",
          executionTime: "Time for generated code to run (depends on test complexity)",
          efficiency: "Optimal balance of speed and accuracy"
        },
        testComplexity: {
          simple: "Basic functionality tests with high expected pass rates",
          moderate: "Standard feature tests with good expected pass rates",
          complex: "Advanced scenario tests with variable pass rates"
        }
      },
      usageGuidelines: {
        apiEndpoints: {
          basic: "GET /api/llm-tests - Returns comparison data and insights",
          withMetrics: "GET /api/llm-tests?metrics=true - Includes detailed performance breakdown",
          filtered: "GET /api/llm-tests?llm={llm_name} - Filter by specific LLM"
        },
        bestPractices: [
          "Regular re-evaluation to track model improvements",
          "Consistent test environment for reliable comparisons",
          "Analysis of both quantitative metrics and qualitative results"
        ],
        decisionSupport: {
          modelSelection: "Use pass rates and efficiency metrics for model choice",
          optimization: "Identify weak areas for targeted improvements",
          benchmarking: "Establish performance baselines for future comparisons"
        }
      }
    };
    
    console.log(`Successfully processed comparison data for ${llms.length} LLMs across ${testNames.length} unique tests`);
    console.log(`Overall performance: ${responseData.summary.overallPassRate} pass rate`);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching LLM test comparison data from MongoDB:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch LLM test comparison data",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
