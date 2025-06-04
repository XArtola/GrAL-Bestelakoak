import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/**
 * MongoDB API Route for Test Results
 * GET /api/mongo/test-results
 * 
 * Fetches data from the 'summary' collection which contains:
 * - LLM: string
 * - totalTests: number
 * - passedTests: number
 * - failedTests: number
 * - tests: array of test objects with name, status, executionTime, generationTime, filePath
 * 
 * Query parameters:
 * - llm: Filter by specific LLM (optional)
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'llm_dashboard';

export async function GET(request) {
  let client;
  
  try {
    const { searchParams } = new URL(request.url);
    const llm = searchParams.get('llm');
    
    console.log('📊 Fetching test results from MongoDB summary collection...');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection('summary');
    
    let query = {};
    
    if (llm) {
      query.LLM = llm;
    }
    
    const results = await collection.find(query).toArray();
    
    // Transform the summary collection data to the format expected by frontend
    const transformedResults = results.map(doc => {
      const { _id, ...cleanData } = doc;
      return {
        llm: cleanData.LLM || 'Unknown LLM',
        totalTests: cleanData.totalTests || 0,
        passedTests: cleanData.passedTests || 0,
        failedTests: cleanData.failedTests || 0,
        tests: (cleanData.tests || []).map(test => ({
          testName: test.name,
          name: test.name,
          status: test.status,
          duration: test.executionTime || 0,
          executionTime: test.executionTime || 0,
          generationTime: test.generationTime || 0,
          filePath: test.filePath || 'unknown.spec.ts',
          file: test.filePath || 'unknown.spec.ts'
        })),
        version: '1.0',
        id: cleanData.LLM?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown'
      };
    });
    
    const response = {
      success: true,
      data: transformedResults,
      count: transformedResults.length,
      timestamp: new Date().toISOString(),
      source: 'mongodb-summary',
      query: { llm }
    };
    
    console.log(`✅ Found ${transformedResults.length} LLM summary datasets`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error fetching test results:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
      count: 0,
      timestamp: new Date().toISOString(),
      source: 'mongodb'
    }, { status: 500 });
    
  } finally {
    if (client) {
      await client.close();
    }
  }
}
