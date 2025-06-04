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
    console.log('MongoDB connected successfully');
  }
  return cachedClient;
}

export async function GET(request: Request) {
  try {
    const dbClient = await connectToDatabase();
    const database = dbClient.db("tests");
    const efficiencyCollection = database.collection("efficiency_metrics");
    const summaryCollection = database.collection("summary");
    
    // Check if detailed test data is requested
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const selectedLLM = searchParams.get('llm');
    
    // Get all efficiency metrics from the collection
    const rawData = await efficiencyCollection.find({}).toArray();
    
    // Remove MongoDB _id field from all documents
    const data = rawData.map(doc => {
      const { _id, ...cleanDoc } = doc;
      return cleanDoc;
    });
    
    // Separate global summary from individual LLM metrics
    const globalSummary = data.find(doc => doc.type === 'global_summary');
    const llmMetrics = data.filter(doc => doc.type !== 'global_summary');
      let detailedTests: any[] = [];
    let passRates: {[llm: string]: number} = {};
      if (includeDetails) {
      // Get detailed test results from the summary collection
      let summaryQuery = {};
      if (selectedLLM) {
        // Try to find matching LLM name in summary collection
        // The LLM names might have different formats between collections
        const possibleLLMNames = [
          selectedLLM,
          selectedLLM.replace(/_/g, ' '),
          selectedLLM.replace(/ /g, '_'),
          selectedLLM.toLowerCase(),
          selectedLLM.toUpperCase(),
          // Add common variations
          selectedLLM.replace(/claude_3_5_sonnet/i, 'Claude 3.5 Sonnet'),
          selectedLLM.replace(/gpt_4o/i, 'GPT-4o'),
          selectedLLM.replace(/gemini_2_5_pro_preview/i, 'Gemini 2.5 Pro'),
        ];
        
        console.log(`Looking for LLM "${selectedLLM}" with possible variations:`, possibleLLMNames);
        
        summaryQuery = { 
          LLM: { 
            $in: possibleLLMNames 
          } 
        };
      }
        console.log('Summary query:', summaryQuery);
      const summaryData = await summaryCollection.find(summaryQuery).toArray();
      console.log(`Found ${summaryData.length} summary documents for query:`, summaryQuery);
      
      // Log all available LLM names in the summary collection for debugging
      if (!selectedLLM) {
        const allSummaryLLMs = await summaryCollection.distinct("LLM");
        console.log('All available LLM names in summary collection:', allSummaryLLMs);
      }
      
      // Calculate pass rates from summary collection
      summaryData.forEach(llmSummary => {
        if (llmSummary.tests && Array.isArray(llmSummary.tests)) {
          const totalTests = llmSummary.tests.length;
          const passedTests = llmSummary.tests.filter((test: any) => test.status === 'passed').length;
          const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
          passRates[llmSummary.LLM] = Math.round(passRate * 100) / 100; // Round to 2 decimal places
        }
      });
      
      // Add original baseline pass rate (100% - 58 passed, 0 failed from resultsOriginal.json)
      passRates['Original/Baseline'] = 100.0;
      passRates['original_ast'] = 100.0;
      passRates['original'] = 100.0;
      passRates['baseline'] = 100.0;
        // Extract detailed test information from summary collection
      summaryData.forEach(llmSummary => {
        console.log(`Processing LLM summary for: "${llmSummary.LLM}" with ${llmSummary.tests?.length || 0} tests`);
        
        if (llmSummary.tests && Array.isArray(llmSummary.tests)) {
          llmSummary.tests.forEach((test: any) => {
            // Extract file name from file path
            const fileName = test.filePath ? test.filePath.split('\\').pop() || test.filePath.split('/').pop() || test.filePath : 'unknown';
            
            detailedTests.push({
              llm: selectedLLM || llmSummary.LLM, // Use selectedLLM if filtering, otherwise use actual LLM name
              originalLLMName: llmSummary.LLM, // Keep track of original name for debugging
              fileName: fileName,
              testName: test.name,
              commands: [], // Commands not available in summary collection
              commandCount: 0, // Command count not available in summary collection
              estimatedGenerationTime: test.generationTime ? Math.round(test.generationTime / 1000) : 0, // Convert from ms to seconds
              actualGenerationTime: test.generationTime || 0,
              executionTime: test.executionTime || 0,
              status: test.status || 'unknown',
              filePath: test.filePath || ''
            });
          });
        }
      });
      
      console.log(`Extracted ${detailedTests.length} detailed tests total`);
      
      // Sort by LLM, then by file name, then by test name
      detailedTests.sort((a, b) => {
        if (a.llm !== b.llm) return a.llm.localeCompare(b.llm);
        if (a.fileName !== b.fileName) return a.fileName.localeCompare(b.fileName);
        return a.testName.localeCompare(b.testName);
      });
    }
      const response = {
      globalSummary: globalSummary || null,
      llmMetrics: llmMetrics || [],
      detailedTests: detailedTests,
      passRates: passRates,
      totalLLMs: llmMetrics.length,
      timestamp: new Date().toISOString()
    };
      return NextResponse.json(response);
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch efficiency data' },
      { status: 500 }
    );
  }
  // Note: We keep the connection open for reuse instead of closing it
}