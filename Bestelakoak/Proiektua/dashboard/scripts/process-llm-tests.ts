import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define types for our data structures
interface TestResult {
  name: string;
  status: string;
  duration: number;
  message?: string;
  filePath?: string;
}

interface TestData {
  LLM: string;
  results: {
    tool: {
      name: string;
    };
    summary: {
      tests: number;
      failed: number;
      passed: number;
      skipped: number;
      pending: number;
      other: number;
      start?: number;
      stop?: number;
    };
    tests: TestResult[];
  };
}

interface ProcessingTime {
  code: string;
  durationMs?: number;
  timestamp?: string;
  output_file?: string;
  source_file?: string;
  requestTimestamp?: string;
  requestTimeMs?: number;
  responseTimeMs?: number;
}

// Map LLM names to their file identifiers
const LLM_FILE_MAP: Record<string, string> = {
  'Claude 3.5 Sonnet': 'claude_3_5_sonnet',
  'Claude 3.7 Sonnet': 'claude_3_7_sonnet',
  'Gemini 2.5 Pro': 'gemini_2_5_pro_preview',
  'GPT-4o': 'GPT_4o',
  'GPT-4o Mini': 'o4_mini_preview'
};

// Load test results from CTRF JSON files
function loadTestResults(): TestData[] {
  const results: TestData[] = [];
  const ctfPath = path.join(process.cwd(), '..', 'cypress-realworld-app', 'ctrf');
  
  if (fs.existsSync(ctfPath)) {
    const files = fs.readdirSync(ctfPath);
    
    // Process each result file
    files.forEach(file => {
      if (file.startsWith('results') && file.endsWith('.json') && file.includes('_inserted')) {
        try {
          const filePath = path.join(ctfPath, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(data) as Omit<TestData, 'LLM'>;
          
          // Extract LLM name from filename
          let llmName = file.replace('results', '').replace('_inserted', '').replace('.json', '');
          
          // Format the LLM name
          if (llmName === 'Claude3_5') llmName = 'Claude 3.5 Sonnet';
          else if (llmName === 'Claude3_7') llmName = 'Claude 3.7 Sonnet';
          else if (llmName === 'Gemini2_5Pro') llmName = 'Gemini 2.5 Pro';
          else if (llmName === 'GPT_4o') llmName = 'GPT-4o';
          else if (llmName === 'o4_mini_preview') llmName = 'GPT-4o Mini';
          
          // Add LLM name to the data
          const testData: TestData = {
            ...jsonData,
            LLM: llmName
          };
          results.push(testData);
        } catch (error) {
          console.error(`Error reading test results from ${file}:`, error);
        }
      }
    });
  }
  
  return results;
}

// Load generation times from matched_data JSON files
function loadProcessingTimes(llmName: string): ProcessingTime[] {
  try {
    // Get the filename identifier for this LLM
    const fileIdentifier = LLM_FILE_MAP[llmName];
    if (!fileIdentifier) {
      console.log(`No file identifier found for LLM: ${llmName}`);
      return [];
    }
    
    const filePath = path.join(process.cwd(), '..', 'matched_data', `matched_data_${fileIdentifier}.json`);
    console.log(`Looking for matched data file: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsedData = JSON.parse(data);
      
      if (Array.isArray(parsedData)) {
        console.log(`Successfully loaded ${parsedData.length} entries from ${filePath}`);
        return parsedData;
      } else {
        console.error(`Invalid data format in ${filePath}, expected array`);
        return [];
      }
    } else {
      console.log(`Matched data file not found: ${filePath}`);
      return [];
    }
  } catch (error) {
    console.error(`Error reading generation times for ${llmName}:`, error);
    return [];
  }
}

// Process data and prepare it for MongoDB
async function processDataForMongoDB() {
  console.log("Processing LLM test comparison data for MongoDB");
  
  // Load test results from CTRF files
  const results: TestData[] = loadTestResults();
  
  // Process the results to create test comparison data
  const llmTestMap = new Map<string, {
    tests: Map<string, { status: string; executionTime: number; generationTime: number; filePath?: string }>;
    totalTests: number;
    passedTests: number;
    failedTests: number;
  }>();
  const testNames = new Set<string>();
  
  // First pass: gather all unique LLMs and test names
  results.forEach((item) => {
    if (!item || !item.LLM || !item.results || !Array.isArray(item.results.tests)) return;
    
    const llmName = item.LLM;
    
    // Add LLM to map if not exists
    if (!llmTestMap.has(llmName)) {
      llmTestMap.set(llmName, { 
        tests: new Map<string, { status: string; executionTime: number; generationTime: number; filePath?: string }>(), 
        totalTests: 0, 
        passedTests: 0, 
        failedTests: 0 
      });
    }
    
    // Track all test names
    item.results.tests.forEach((test: TestResult) => {
      if (test && test.name) {
        testNames.add(test.name);
        
        // Update totals
        const llmData = llmTestMap.get(llmName)!;
        llmData.totalTests++;
        if (test.status === 'passed') {
          llmData.passedTests++;
        } else if (test.status === 'failed') {
          llmData.failedTests++;
        }
      }
    });
  });
  
  // Second pass: get test results and durations
  results.forEach((item) => {
    if (!item || !item.LLM || !item.results || !Array.isArray(item.results.tests)) return;
    
    const llmName = item.LLM;
    const llmData = llmTestMap.get(llmName);
    if (!llmData) return;
    
    // Add test details to LLM data
    item.results.tests.forEach((test: TestResult) => {
      if (!test || !test.name) return;
      
      const testName = test.name;
      const status = test.status;
      const executionTime = test.duration || 0;
        
      // Get or create test entry
      if (!llmData.tests.has(testName)) {
        llmData.tests.set(testName, {
          status,
          executionTime,
          generationTime: 0, // Will be populated from processing_time files
          filePath: test.filePath // Include the file path from test results
        });
      }
    });
  });
    
  // Load generation times from matched_data files for each LLM
  for (const llmName of llmTestMap.keys()) {
    const generationData = loadProcessingTimes(llmName);
    
    // Create mapping of test filenames to generation times
    const fileToGenerationTime = new Map<string, number>();
    
    // First, extract all output_file to durationMs mappings
    if (generationData && generationData.length > 0) {
      generationData.forEach((entry: any) => {
        if (!entry || !entry.durationMs) return;
          
        // If there's an output_file, use that for matching
        if (entry.output_file) {
          // Get the filename part from the output_file path
          const outputFilePath = entry.output_file;
          const filenameParts = outputFilePath.split(/[\\\/]/); // Split by both / and \
          const outputFileName = filenameParts[filenameParts.length - 1];
          
          // Extract the test name from the file name (e.g., "auth1.spec" from "auth1.spec_response_...")
          // Match file names like 'transaction-feeds11.spec' or 'auth1.spec'
          const testFileMatch = outputFileName.match(/([a-zA-Z0-9-]+)\.spec/);
          const testFileName = testFileMatch ? `${testFileMatch[1]}.spec.ts` : '';
          
          // If we have a valid filename and duration, store it
          if (testFileName && entry.durationMs) {
            fileToGenerationTime.set(testFileName, entry.durationMs);
            console.log(`Found generation time ${entry.durationMs}ms for file "${testFileName}" in ${llmName}`);
            
            // Also store with just the base name (without extension) for flexible matching
            const baseFileName = testFileMatch[1];
            if (baseFileName) {
              fileToGenerationTime.set(baseFileName, entry.durationMs);
              console.log(`Added base name mapping: ${baseFileName} -> ${entry.durationMs}ms`);
            }
          }
        }
      });
    }
      
    // Now match test names to their generation times
    const llmData = llmTestMap.get(llmName);
    if (!llmData) continue;
    
    for (const [testName, testData] of llmData.tests.entries()) {
      // Extract file path from test data if available
      const testFilePath = testData.filePath || '';
      
      // Try multiple strategies to match the test with generation time
      
      // Strategy 1: Use the file path if available
      if (testFilePath) {
        // Extract the filename from the full path
        const pathParts = testFilePath.split(/[\\\/]/);
        const fullFileName = pathParts[pathParts.length - 1];
        
        // Check if we have a direct match with full filename
        if (fileToGenerationTime.has(fullFileName)) {
          const durationMs = fileToGenerationTime.get(fullFileName)!;
          testData.generationTime = durationMs;
          console.log(`File path match! Generation time ${durationMs}ms for test "${testName}" with file "${fullFileName}" in ${llmName}`);
          continue; // Move to next test if we found a match
        }
        
        // Extract the file name without extension
        const baseNameMatch = fullFileName.match(/([a-zA-Z0-9-]+)\.spec\.ts$/);
        if (baseNameMatch && baseNameMatch[1]) {
          const baseName = baseNameMatch[1];
          
          // Check if we have a match with the base name
          if (fileToGenerationTime.has(baseName)) {
            const durationMs = fileToGenerationTime.get(baseName)!;
            testData.generationTime = durationMs;
            console.log(`Base name match! Generation time ${durationMs}ms for test "${testName}" with base "${baseName}" in ${llmName}`);
            continue; // Move to next test if we found a match
          }
          
          // Also try with .spec.ts extension
          const specFileName = `${baseName}.spec.ts`;
          if (fileToGenerationTime.has(specFileName)) {
            const durationMs = fileToGenerationTime.get(specFileName)!;
            testData.generationTime = durationMs;
            console.log(`Spec filename match! Generation time ${durationMs}ms for test "${testName}" with file "${specFileName}" in ${llmName}`);
            continue;
          }
        }
      }
      
      // Strategy 2: Extract from test name itself
      const testNameMatch = testName.match(/^([a-zA-Z0-9-]+)\.spec/i);
      let testFileName = '';
      
      if (testNameMatch) {
        testFileName = `${testNameMatch[1]}.spec.ts`;
        
        // Check for direct match with test name
        if (fileToGenerationTime.has(testFileName)) {
          const durationMs = fileToGenerationTime.get(testFileName)!;
          testData.generationTime = durationMs;
          console.log(`Test name match! Generation time ${durationMs}ms for test "${testName}" with file "${testFileName}" in ${llmName}`);
          continue;
        }
        
        // Also try with just the base name
        const baseName = testNameMatch[1];
        if (fileToGenerationTime.has(baseName)) {
          const durationMs = fileToGenerationTime.get(baseName)!;
          testData.generationTime = durationMs;
          console.log(`Test base name match! Generation time ${durationMs}ms for test "${testName}" with base "${baseName}" in ${llmName}`);
          continue;
        }
      } else {
        // If no spec pattern in name, use first word as potential file name
        const firstWord = testName.split(' ')[0].toLowerCase();
        
        // Check for direct match with first word
        if (fileToGenerationTime.has(firstWord)) {
          const durationMs = fileToGenerationTime.get(firstWord)!;
          testData.generationTime = durationMs;
          console.log(`First word match! Generation time ${durationMs}ms for test "${testName}" with word "${firstWord}" in ${llmName}`);
          continue;
        }
        
        // Try with .spec.ts extension
        testFileName = `${firstWord}.spec.ts`;
        if (fileToGenerationTime.has(testFileName)) {
          const durationMs = fileToGenerationTime.get(testFileName)!;
          testData.generationTime = durationMs;
          console.log(`First word + spec match! Generation time ${durationMs}ms for test "${testName}" with file "${testFileName}" in ${llmName}`);
          continue;
        }
      }
      
      // Strategy 3: Partial matching as last resort
      for (const [mappedFileName, durationMs] of fileToGenerationTime.entries()) {
        // Skip if mappedFileName is too short (might be just a base name)
        if (mappedFileName.length < 4) continue;
        
        // Extract core names for comparison
        const mappedCore = mappedFileName.replace(/\.spec\.ts$/, '').toLowerCase();
        
        // Get words from test name for comparison
        const testWords = testName.toLowerCase().split(/\s+/);
        
        // Look for any significant word in test name that matches the mapped filename
        const matchFound = testWords.some(word => 
          word.length > 3 && mappedCore.includes(word)
        );
        
        if (matchFound) {
          testData.generationTime = durationMs;
          console.log(`Fuzzy match! Generation time ${durationMs}ms for test "${testName}" with file "${mappedFileName}" in ${llmName}`);
          break;
        }
      }
    }
  }
  
  // Convert map to data format for MongoDB storage
  const testComparison = {
    llms: Array.from(llmTestMap.keys()),
    testNames: Array.from(testNames),
    testData: Array.from(llmTestMap.entries()).map(([llmName, data]) => ({
      llmName,
      totalTests: data.totalTests,
      passedTests: data.passedTests,
      failedTests: data.failedTests,
      tests: Array.from(data.tests.entries()).map(([testName, testData]) => ({
        testName,
        status: testData.status,
        executionTime: testData.executionTime,
        generationTime: testData.generationTime,
        filePath: testData.filePath
      }))
    }))
  };

  // Connect to MongoDB
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const database = client.db("llm_test_comparison");
    const collection = database.collection("test_data");
    
    // Delete existing data first (optional, depending on your requirements)
    await collection.deleteMany({});
    console.log("Cleared existing data from collection");
    
    // Insert the new data
    await collection.insertOne({
      timestamp: new Date(),
      data: testComparison
    });
    console.log("Successfully inserted LLM test comparison data into MongoDB");
    
  } catch (error) {
    console.error("Error inserting data into MongoDB:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

// Run the script
processDataForMongoDB().catch(console.error);
