import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Define types for our data structures
interface TestResult {
  llmName: string;
  testName: string;
  status: string;
  executionTime: number;
  generationTime: number;
  filePath?: string;
}

interface TestSummary {
  _id?: ObjectId | string;
  llmName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

// MongoDB collection names from environment variables
const COLLECTION_RESULTS = process.env.MONGODB_COLLECTION_RESULTS || 'results';
const COLLECTION_SUMMARY = process.env.MONGODB_COLLECTION_SUMMARY || 'summary';
const DB_NAME = process.env.MONGODB_DB_NAME || 'tests';

export async function GET() {
  try {
    console.log("Loading LLM test comparison data from MongoDB");
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // Get collections
    const resultsCollection = db.collection(COLLECTION_RESULTS);
    const summaryCollection = db.collection(COLLECTION_SUMMARY);
      // Fetch test names
    const testNamesDoc = await summaryCollection.findOne({ _id: 'test-names' } as any);
    const testNames = testNamesDoc?.testNames || [];    // Fetch LLM summaries
    const summaries = await summaryCollection.find({
      _id: { $ne: 'test-names' } // Exclude the test-names document
    } as any).toArray() as unknown as TestSummary[];
      // Extract LLM names from summaries
    const llmNames = summaries.map(summary => summary.llmName);
    
    // Debug logging
    console.log("Raw summaries from DB:", summaries.map(s => ({ id: s._id, llmName: s.llmName })));
    console.log("Extracted LLM names:", llmNames);
    
    // Fetch all test results
    const testResults = await resultsCollection.find({}).toArray() as unknown as TestResult[];
    
    // Debug logging for test results
    console.log("Sample test results:", testResults.slice(0, 3).map(r => ({ llmName: r.llmName, testName: r.testName, status: r.status })));
    console.log("Unique LLM names in test results:", [...new Set(testResults.map(r => r.llmName))]);
    
    // Group test results by LLM
    const testDataByLlm = llmNames.map(llmName => {
      // Filter results for this LLM
      const llmResults = testResults.filter(result => result.llmName === llmName);
      
      // Get the summary for this LLM
      const summary = summaries.find(s => s.llmName === llmName);
      
      console.log(`LLM: ${llmName}, Results found: ${llmResults.length}, Summary found: ${!!summary}`);
      
      return {
        llmName,
        totalTests: summary?.totalTests || 0,
        passedTests: summary?.passedTests || 0,
        failedTests: summary?.failedTests || 0,
        tests: llmResults
      };
    });
    
    // Format the response
    const testComparison = {
      llms: llmNames,
      testNames: testNames,
      testData: testDataByLlm
    };
    
    console.log(`Loaded data for ${llmNames.length} LLMs with ${testNames.length} unique tests`);
    return NextResponse.json(testComparison);
  } catch (error) {
    console.error("Error fetching LLM test comparison data from MongoDB:", error);
    return NextResponse.json(
      { error: "Failed to fetch LLM test comparison data" }, 
      { status: 500 }
    );
  }
}
