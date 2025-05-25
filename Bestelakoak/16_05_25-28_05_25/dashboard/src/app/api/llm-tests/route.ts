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

export async function GET() {
  try {
    console.log("Loading LLM test comparison data from MongoDB");
      // Connect to MongoDB
    const mongoClient = await clientPromise;
    const db = mongoClient.db(process.env.MONGODB_DB_NAME || 'tests');
      // Get collections
    const resultsCollection = db.collection('individual_tests'); // Use individual_tests collection directly
    const summaryCollection = db.collection(process.env.MONGODB_COLLECTION_SUMMARY || 'summary');
      // Retrieve summary data
    const summary = await summaryCollection.findOne({ _id: 'summary' } as any);
    const llmSummaries = await summaryCollection.find({ llmName: { $exists: true } } as any).toArray();
    
    if (!summary) {
      console.log("Summary data not found in MongoDB. Database might be empty.");
      return NextResponse.json(
        { error: "Test data not found. Run the data processing script first." }, 
        { status: 404 }
      );
    }
    
    // Retrieve all test results
    const testResults = await resultsCollection.find({}).toArray();
    
    // Process results into the expected format
    const llms = summary.llms;
    const testNames = summary.testNames;
      // Structure test data by LLM
    const testData = llmSummaries.map((llmSummary: any) => {
      const llmName = llmSummary.llmName;
      const llmTests = testResults.filter((test: any) => test.llmName === llmName);
      
      return {
        llmName,
        totalTests: llmSummary.totalTests,
        passedTests: llmSummary.passedTests,
        failedTests: llmSummary.failedTests,
        tests: llmTests.map((test: any) => ({
          testName: test.testName,
          status: test.status,
          executionTime: test.executionTime,
          generationTime: test.generationTime,
          filePath: test.filePath
        }))
      };
    });
    
    // Construct the response
    const testComparison: TestComparison = {
      llms,
      testNames,
      testData
    };
    
    return NextResponse.json(testComparison);
  } catch (error) {
    console.error("Error fetching LLM test comparison data from MongoDB:", error);
    return NextResponse.json(
      { error: "Failed to fetch LLM test comparison data" }, 
      { status: 500 }
    );
  }
}
