#!/usr/bin/env node

/**
 * Script to ingest test data into MongoDB original collections
 * Stores results files in test_execution_results collection
 * Stores metrics files in test_efficiency_metrics collection
 * Only adds LLM field to original data - no metadata, calculations, or summaries
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'llm_testing_dashboard';
const RESULTS_COLLECTION = 'test_execution_results';
const METRICS_COLLECTION = 'test_efficiency_metrics';

// Data directories
const RESULTS_DIR = path.join(__dirname, '..', 'data', 'test_execution_results', 'executed_tests_results');
const METRICS_DIR = path.join(__dirname, '..', 'data', 'test_execution_results', 'test_eficcency_metrics');

console.log('📂 Results directory:', RESULTS_DIR);
console.log('📂 Metrics directory:', METRICS_DIR);
console.log('📂 Results exists:', fs.existsSync(RESULTS_DIR));
console.log('📂 Metrics exists:', fs.existsSync(METRICS_DIR));

/**
 * Extract LLM name from filename
 * Examples: 
 * - results_claude_3_5_sonnet.json -> claude_3_5_sonnet
 * - resultsgemini_2_0_flash.json -> gemini_2_0_flash (missing underscore)
 * - test-efficiency-metrics_gpt_4o.json -> gpt_4o
 */
function extractLLMName(filename) {
  if (filename.startsWith('results_')) {
    return filename.replace('results_', '').replace('.json', '');
  }
  if (filename.startsWith('results') && !filename.startsWith('results_')) {
    // Handle missing underscore case: resultsgemini_2_0_flash.json
    return filename.replace('results', '').replace('.json', '');
  }
  if (filename.startsWith('test-efficiency-metrics_')) {
    return filename.replace('test-efficiency-metrics_', '').replace('.json', '');
  }
  return null;
}

/**
 * Process raw file data - simply adds LLM field to original data
 */
function processRawData(rawData, llmName, filename) {
  return {
    llm: llmName,
    filename: filename,
    ingestionTimestamp: new Date(),
    ...rawData // Spread the original data unchanged
  };
}

/**
 * Get all available data files from both directories
 */
function getAvailableDataFiles() {
  const dataFiles = [];
  
  // Check results directory
  if (fs.existsSync(RESULTS_DIR)) {
    const resultFiles = fs.readdirSync(RESULTS_DIR)
      .filter(f => (f.startsWith('results_') || f.startsWith('results')) && f.endsWith('.json'));
    
    resultFiles.forEach(file => {
      const llmName = extractLLMName(file);
      if (llmName) {
        dataFiles.push({
          filePath: path.join(RESULTS_DIR, file),
          filename: file,
          llmName: llmName,
          dataType: 'results'
        });
        console.log(`🔍 Found results file: ${file} -> LLM: ${llmName}`);
      }
    });
  }
  
  // Check metrics directory
  if (fs.existsSync(METRICS_DIR)) {
    const metricFiles = fs.readdirSync(METRICS_DIR)
      .filter(f => f.startsWith('test-efficiency-metrics_') && f.endsWith('.json'));
    
    metricFiles.forEach(file => {
      const llmName = extractLLMName(file);
      if (llmName) {
        dataFiles.push({
          filePath: path.join(METRICS_DIR, file),
          filename: file,
          llmName: llmName,
          dataType: 'metrics'
        });
        console.log(`🔍 Found metrics file: ${file} -> LLM: ${llmName}`);
      }
    });
  }
  
  return dataFiles;
}

/**
 * Main ingestion function - stores data back to original collections
 */
async function ingestTestData() {
  let client;
  
  try {
    console.log('🚀 Starting test data ingestion...');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DATABASE_NAME);
    const resultsCollection = db.collection(RESULTS_COLLECTION);
    const metricsCollection = db.collection(METRICS_COLLECTION);
    
    // Clear existing data from both collections
    console.log('🧹 Clearing existing data from both collections...');
    await resultsCollection.deleteMany({});
    await metricsCollection.deleteMany({});
    
    // Get all available data files
    const dataFiles = getAvailableDataFiles();
    console.log(`📊 Found ${dataFiles.length} data files to process`);
    
    let processedCount = 0;
    let resultsCount = 0;
    let metricsCount = 0;
    
    for (const fileInfo of dataFiles) {
      console.log(`\n🔄 Processing ${fileInfo.filename} (${fileInfo.dataType})...`);
      
      try {
        // Read raw file data
        const rawData = JSON.parse(fs.readFileSync(fileInfo.filePath, 'utf8'));
        
        // Process with minimal transformation (just add LLM field)
        const processedData = processRawData(rawData, fileInfo.llmName, fileInfo.filename);
        
        // Insert into appropriate collection based on data type
        if (fileInfo.dataType === 'results') {
          await resultsCollection.insertOne(processedData);
          resultsCount++;
          console.log(`  ✅ Inserted to ${RESULTS_COLLECTION} for ${fileInfo.llmName}`);
        } else if (fileInfo.dataType === 'metrics') {
          await metricsCollection.insertOne(processedData);
          metricsCount++;
          console.log(`  ✅ Inserted to ${METRICS_COLLECTION} for ${fileInfo.llmName}`);
        }
        
        processedCount++;
        
      } catch (error) {
        console.error(`  ❌ Error processing ${fileInfo.filename}:`, error.message);
      }
    }
    
    // Create basic indexes for querying
    console.log('\n🔍 Creating database indexes...');
    await resultsCollection.createIndex({ llm: 1 });
    await resultsCollection.createIndex({ filename: 1 });
    await metricsCollection.createIndex({ llm: 1 });
    await metricsCollection.createIndex({ filename: 1 });
    
    console.log(`\n🎉 Data ingestion completed successfully!`);
    console.log(`📊 Processed ${processedCount} files total`);
    console.log(`� Results files: ${resultsCount} → stored in ${RESULTS_COLLECTION}`);
    console.log(`📊 Metrics files: ${metricsCount} → stored in ${METRICS_COLLECTION}`);
    
  } catch (error) {
    console.error('❌ Error during data ingestion:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('📡 MongoDB connection closed');
    }
  }
}

// Run the script if called directly
console.log('🔧 Script starting...');
console.log('📍 import.meta.url:', import.meta.url);
console.log('📍 process.argv[1]:', process.argv[1]);

// Convert paths to URLs for proper comparison (handles Windows path separators)
const currentFileUrl = import.meta.url;
const execFileUrl = `file:///${process.argv[1].replace(/\\/g, '/')}`;

console.log('📍 Current file URL:', currentFileUrl);
console.log('📍 Exec file URL:', execFileUrl);
console.log('📍 Comparison:', currentFileUrl === execFileUrl);

if (currentFileUrl === execFileUrl) {
  console.log('✅ Running main function...');
  ingestTestData().catch(console.error);
} else {
  console.log('❌ Script not running as main module');
  console.log('🔧 Force running main function anyway...');
  ingestTestData().catch(console.error);
}

export {
  ingestTestData,
  processRawData,
  getAvailableDataFiles,
  extractLLMName
};
