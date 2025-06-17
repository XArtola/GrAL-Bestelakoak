import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = "mongodb://localhost:27017";

// Create a cached connection with proper options
let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await cachedClient.connect();
    console.log('MongoDB connected successfully for test-generation API');
  }
  return cachedClient;
}

export async function GET(request: Request) {
  try {
    const dbClient = await connectToDatabase();
    const database = dbClient.db("tests");
    const testCreationCollection = database.collection("test_creation_results");
      // Check if detailed test data is requested
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const selectedLLM = searchParams.get('llm');
    const allLLMs = searchParams.get('all') === 'true';
    
    // Get test creation data from the collection
    const testCreationData = await testCreationCollection.find({}).toArray();    // Process the data to create LLM summaries from test_creation_results
    const llmMap = new Map<string, {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      totalGenerationTime: number;
      uniqueFiles: Set<string>;
      filesWithTests: Set<string>;
      tests: any[];
    }>();

    // Group data by LLM
    testCreationData.forEach((test: any) => {
      const llmName = test.llmName || test.llmNormalizedName || 'Unknown';
      
      if (!llmMap.has(llmName)) {
        llmMap.set(llmName, {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          totalGenerationTime: 0,
          uniqueFiles: new Set(),
          filesWithTests: new Set(),
          tests: []
        });
      }
      
      const llmData = llmMap.get(llmName)!;
      llmData.totalTests++;
      
      // Add generation time
      if (test.durationMs) {
        llmData.totalGenerationTime += test.durationMs;
      }
      
      // Track files
      if (test.testId) {
        llmData.uniqueFiles.add(test.testId);
        // Count as generated if test has code content
        if (test.code && test.code.trim() !== '') {
          llmData.filesWithTests.add(test.testId);
        }
      }
      
      // Add test data for detailed view
      llmData.tests.push({
        name: test.testId || 'unknown',
        status: test.code && test.code.trim() !== '' ? 'generated' : 'not_generated',
        generationTime: test.durationMs || 0,
        filePath: test.source_file || test.output_file || '',
        code: test.code || ''
      });
    });

    // Convert to LLM summaries
    const llmSummaries = Array.from(llmMap.entries()).map(([llmName, data]) => {
      const totalFiles = 45; // Expected total files based on the dashboard context
      const filesGenerated = data.filesWithTests.size;
      const fileGenerationRate = totalFiles > 0 ? (filesGenerated / totalFiles) * 100 : 0;
      
      return {
        llm: llmName,
        totalTests: data.totalTests,
        passedTests: data.passedTests,
        failedTests: data.failedTests,
        passRate: data.totalTests > 0 ? (data.passedTests / data.totalTests) * 100 : 0,
        averageGenerationTime: data.totalTests > 0 ? data.totalGenerationTime / data.totalTests : 0,
        totalGenerationTime: data.totalGenerationTime,
        totalFiles: totalFiles,
        filesGenerated: filesGenerated,
        fileGenerationRate: fileGenerationRate
      };
    });      let detailedTests: any[] = [];
    if (includeDetails) {
      // Filter by selected LLM if specified, unless all=true
      const filteredData = (selectedLLM && !allLLMs)
        ? testCreationData.filter((test: any) => test.llmName === selectedLLM || test.llmNormalizedName === selectedLLM)
        : testCreationData;
      
      // Extract detailed test information
      filteredData.forEach((test: any) => {
        const llmName = test.llmName || test.llmNormalizedName || 'Unknown';
        
        detailedTests.push({
          llm: llmName,
          fileName: test.testId || 'unknown',
          testName: test.testId || 'unknown',
          generationTime: test.durationMs || 0, // in milliseconds
          generationTimeSeconds: test.durationMs ? Math.round(test.durationMs / 1000) : 0, // in seconds
          executionTime: 0, // not available in test_creation_results
          executionTimeSeconds: 0, // not available in test_creation_results
          status: test.code && test.code.trim() !== '' ? 'generated' : 'not_generated',
          filePath: test.source_file || test.output_file || '',
          generated: test.code && test.code.trim() !== '',
          passed: false // not available in test_creation_results
        });
      });
      
      // Sort by LLM, then by file name, then by test name
      detailedTests.sort((a, b) => {
        if (a.llm !== b.llm) return a.llm.localeCompare(b.llm);
        if (a.fileName !== b.fileName) return a.fileName.localeCompare(b.fileName);
        return a.testName.localeCompare(b.testName);
      });
    }
    
    const response = {
      llmSummaries: llmSummaries || [],
      detailedTests: detailedTests,
      totalLLMs: llmSummaries.length,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Test generation API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test generation data' },
      { status: 500 }
    );
  }
}
