// Script to process LLM test data and save it to MongoDB
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// MongoDB connection settings
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'tests';
const resultsCollection = 'individual_tests'; // Use individual_tests collection
const summaryCollection = process.env.MONGODB_COLLECTION_SUMMARY || 'summary';

// Map LLM names to their file identifiers
const LLM_FILE_MAP = {
  'Claude 3.5 Sonnet': 'claude_3_5_sonnet',
  'Claude 3.7 Sonnet': 'claude_3_7_sonnet',
  'Claude Sonnet 4': 'claude_sonnet_4',
  'Gemini 2.5 Pro': 'gemini_2_5_pro_preview',
  'GPT-4o': 'GPT_4o',
  'GPT-4o Mini': 'o4_mini_preview'
};

// Function to load test results from CTRF JSON files
function loadTestResults() {
  const results = [];
  const ctfPath = path.join(__dirname, '..', '..', 'cypress-realworld-app', 'ctrf');
  
  if (fs.existsSync(ctfPath)) {
    const files = fs.readdirSync(ctfPath);
    
    // Process each result file
    files.forEach(file => {
      if (file.startsWith('results') && file.endsWith('.json') && file.includes('_inserted')) {
        try {
          const filePath = path.join(ctfPath, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(data);
          
          // Extract LLM name from filename
          let llmName = file.replace('results', '').replace('_inserted', '').replace('.json', '');
            // Format the LLM name
          if (llmName === 'Claude3_5') llmName = 'Claude 3.5 Sonnet';
          else if (llmName === 'Claude3_7') llmName = 'Claude 3.7 Sonnet';
          else if (llmName === 'Gemini2_5Pro') llmName = 'Gemini 2.5 Pro';
          else if (llmName === 'GPT_4o') llmName = 'GPT-4o';
          else if (llmName === 'o4_mini_preview') llmName = 'GPT-4o Mini';
          else if (llmName === 'claude_sonnet_4' || llmName === 'Claude_sonnet_4') llmName = 'Claude Sonnet 4';
          
          // Add LLM name to the data
          const testData = {
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

// Function to load generation times from matched_data JSON files
function loadProcessingTimes(llmName) {
  try {
    // Get the filename identifier for this LLM
    const fileIdentifier = LLM_FILE_MAP[llmName];
    if (!fileIdentifier) {
      console.log(`No file identifier found for LLM: ${llmName}`);
      return [];
    }
    
    const filePath = path.join(__dirname, '..', '..', 'matched_data', `matched_data_${fileIdentifier}.json`);
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

// Function to process the test data and save it to MongoDB
async function processAndSaveData() {
  // Initialize MongoDB client
  console.log(`Connecting to MongoDB at ${uri}...`);
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const resultsCol = db.collection(resultsCollection);
    const summaryCol = db.collection(summaryCollection);
    
    // Clear existing data
    await resultsCol.deleteMany({});
    await summaryCol.deleteMany({});
    console.log('Cleared existing data from MongoDB');
    
    // Load test results
    console.log('Loading test results from files...');
    const results = loadTestResults();
    
    // Process the results to create test comparison data
    const llmTestMap = new Map();
    const testNames = new Set();
    
    // First pass: gather all unique LLMs and test names
    results.forEach((item) => {
      if (!item || !item.LLM || !item.results || !Array.isArray(item.results.tests)) return;
      
      const llmName = item.LLM;
      
      // Add LLM to map if not exists
      if (!llmTestMap.has(llmName)) {
        llmTestMap.set(llmName, { 
          tests: new Map(), 
          totalTests: 0, 
          passedTests: 0, 
          failedTests: 0 
        });
      }
      
      // Track all test names
      item.results.tests.forEach((test) => {
        if (test && test.name) {
          testNames.add(test.name);
          
          // Update totals
          const llmData = llmTestMap.get(llmName);
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
      item.results.tests.forEach((test) => {
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
      console.log(`\n=== Processing generation times for LLM: ${llmName} ===`);
      const generationData = loadProcessingTimes(llmName);
      console.log(`Found ${generationData.length} generation data entries for ${llmName}`);
      
      // Create mapping of test filenames to generation times
      const fileToGenerationTime = new Map();
      
      // First, extract all output_file to durationMs mappings
      if (generationData && generationData.length > 0) {
        generationData.forEach((entry) => {
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
              
              // Also store with just the base name (without extension) for flexible matching
              const baseFileName = testFileMatch[1];
              if (baseFileName) {
                fileToGenerationTime.set(baseFileName, entry.durationMs);
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
            const durationMs = fileToGenerationTime.get(fullFileName);
            testData.generationTime = durationMs;
            continue; // Move to next test if we found a match
          }
          
          // Extract the file name without extension
          const baseNameMatch = fullFileName.match(/([a-zA-Z0-9-]+)\.spec\.ts$/);
          if (baseNameMatch && baseNameMatch[1]) {
            const baseName = baseNameMatch[1];
            
            // Check if we have a match with the base name
            if (fileToGenerationTime.has(baseName)) {
              const durationMs = fileToGenerationTime.get(baseName);
              testData.generationTime = durationMs;
              continue; // Move to next test if we found a match
            }
            
            // Also try with .spec.ts extension
            const specFileName = `${baseName}.spec.ts`;
            if (fileToGenerationTime.has(specFileName)) {
              const durationMs = fileToGenerationTime.get(specFileName);
              testData.generationTime = durationMs;
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
            const durationMs = fileToGenerationTime.get(testFileName);
            testData.generationTime = durationMs;
            continue;
          }
          
          // Also try with just the base name
          const baseName = testNameMatch[1];
          if (fileToGenerationTime.has(baseName)) {
            const durationMs = fileToGenerationTime.get(baseName);
            testData.generationTime = durationMs;
            continue;
          }
        } else {
          // If no spec pattern in name, use first word as potential file name
          const firstWord = testName.split(' ')[0].toLowerCase();
          
          // Check for direct match with first word
          if (fileToGenerationTime.has(firstWord)) {
            const durationMs = fileToGenerationTime.get(firstWord);
            testData.generationTime = durationMs;
            continue;
          }
          
          // Try with .spec.ts extension
          testFileName = `${firstWord}.spec.ts`;
          if (fileToGenerationTime.has(testFileName)) {
            const durationMs = fileToGenerationTime.get(testFileName);
            testData.generationTime = durationMs;
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
            break;
          }
        }
      }
      
      // Debug: Show some sample generation times after processing
      console.log(`Sample generation times for ${llmName}:`);
      let sampleCount = 0;
      for (const [testName, testData] of llmData.tests.entries()) {
        if (sampleCount < 3) {
          console.log(`  ${testName}: ${testData.generationTime}ms`);
          sampleCount++;
        }
      }
    }
    
    // Convert test data to format for MongoDB
    console.log('Processing test data for MongoDB...');
    const llmsList = Array.from(llmTestMap.keys());
    const testNamesList = Array.from(testNames);
    
    // Create summary document for MongoDB
    const summaryData = {
      llms: llmsList,
      testNames: testNamesList,
      lastUpdated: new Date()
    };
    
    // Create individual test documents for MongoDB
    const testDocuments = [];
    
    // Convert map to array of documents
    for (const [llmName, llmData] of llmTestMap.entries()) {
      const llmSummary = {
        llmName,
        totalTests: llmData.totalTests,
        passedTests: llmData.passedTests,
        failedTests: llmData.failedTests
      };
      
      // Add LLM summary to summary collection
      await summaryCol.updateOne(
        { llmName },
        { $set: llmSummary },
        { upsert: true }
      );
      
      // Add individual test results
      for (const [testName, testData] of llmData.tests.entries()) {
        const testDocument = {
          llmName,
          testName,
          status: testData.status,
          executionTime: testData.executionTime,
          generationTime: testData.generationTime,
          filePath: testData.filePath
        };
        
        testDocuments.push(testDocument);
      }
    }
    
    // Save test data to MongoDB
    if (testDocuments.length > 0) {
      console.log(`Inserting ${testDocuments.length} test documents into MongoDB...`);
      await resultsCol.insertMany(testDocuments);
    }
    
    // Save the summary data
    await summaryCol.updateOne(
      { _id: 'summary' },
      { $set: summaryData },
      { upsert: true }
    );
    
    console.log('Data successfully processed and saved to MongoDB.');
  } catch (error) {
    console.error('Error processing and saving data:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
processAndSaveData()
  .then(() => console.log('Script completed'))
  .catch(err => console.error('Script failed:', err));
