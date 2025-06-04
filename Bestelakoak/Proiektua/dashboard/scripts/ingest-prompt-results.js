import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { globSync } from 'glob';

/**
 * Script to ingest processed prompt results into MongoDB
 * Saves data to test_creation_results collection
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'tests';
const COLLECTION_NAME = 'test_creation_results';

// Data path - relative to dashboard/scripts, go to dashboard/data/processed_prompt_results
const PROCESSED_DATA_DIR = path.join(__dirname, '..', 'data', 'processed_prompt_results');
/**
 * Database connection helper
 */
class PromptResultsIngester {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      console.log(`📡 URI: ${MONGODB_URI}`);
      console.log(`📊 Database: ${DB_NAME}`);
      
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      
      console.log('✅ Connected to MongoDB successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
  /**
   * Get all JSON files from the processed_prompt_results directory
   */  getDataFiles() {
    console.log(`📂 Scanning directory: ${PROCESSED_DATA_DIR}`);
    console.log(`📂 Absolute path: ${path.resolve(PROCESSED_DATA_DIR)}`);
    
    if (!fs.existsSync(PROCESSED_DATA_DIR)) {
      console.error(`❌ Directory not found: ${PROCESSED_DATA_DIR}`);
      throw new Error(`Directory not found: ${PROCESSED_DATA_DIR}`);
    }
    
    const pattern = path.join(PROCESSED_DATA_DIR, 'matched_data_*.json');
    // Convert backslashes to forward slashes for glob on Windows
    const normalizedPattern = pattern.replace(/\\/g, '/');
    console.log(`🔍 Search pattern: ${pattern}`);
    console.log(`🔍 Normalized pattern: ${normalizedPattern}`);
    const files = globSync(normalizedPattern);
    
    console.log(`📄 Found ${files.length} data files:`);
    files.forEach(file => console.log(`  - ${path.basename(file)}`));
    
    return files;
  }

  /**
   * Parse LLM name from filename
   */
  extractLlmName(filename) {
    const match = filename.match(/matched_data_(.+)\.json$/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Process and validate a single record
   */
  processRecord(record, llmName, filename) {
    // Add metadata
    const processedRecord = {
      ...record,
      llmNormalizedName: llmName,
      sourceFile: filename,
      ingestionTimestamp: new Date(),
      // Convert timestamp strings to Date objects if they exist
      ...(record.timestamp && { timestampDate: new Date(record.timestamp) }),
      ...(record.requestTimestamp && { requestTimestampDate: new Date(record.requestTimestamp) })
    };

    // Validate required fields
    if (!record.testId) {
      console.warn(`⚠️  Record missing testId in ${filename}`);
    }
    if (!record.code) {
      console.warn(`⚠️  Record missing code in ${filename} for testId: ${record.testId}`);
    }

    return processedRecord;
  }

  /**
   * Load and process data from a single file
   */
  async loadDataFile(filePath) {
    console.log(`📖 Loading data from: ${path.basename(filePath)}`);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const rawData = JSON.parse(fileContent);
      const llmName = this.extractLlmName(path.basename(filePath));
      
      if (!Array.isArray(rawData)) {
        throw new Error(`Expected array data in ${filePath}`);
      }

      console.log(`  📊 Found ${rawData.length} records`);
      
      // Process each record
      const processedData = rawData.map(record => 
        this.processRecord(record, llmName, path.basename(filePath))
      );

      return {
        llmName,
        data: processedData,
        count: processedData.length
      };
    } catch (error) {
      console.error(`❌ Error loading ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Insert data into MongoDB collection
   */
  async insertData(data, llmName) {
    try {
      const collection = this.db.collection(COLLECTION_NAME);
      
      console.log(`💾 Inserting ${data.length} records for ${llmName}...`);
      
      // Delete existing data for this LLM to avoid duplicates
      const deleteResult = await collection.deleteMany({ llmNormalizedName: llmName });
      if (deleteResult.deletedCount > 0) {
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing records for ${llmName}`);
      }
      
      // Insert new data
      const result = await collection.insertMany(data);
      console.log(`✅ Inserted ${result.insertedCount} records for ${llmName}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Error inserting data for ${llmName}:`, error.message);
      throw error;
    }
  }

  /**
   * Create indexes for better query performance
   */
  async createIndexes() {
    try {
      const collection = this.db.collection(COLLECTION_NAME);
      
      console.log('🔍 Creating database indexes...');
      
      const indexes = [
        { testId: 1 },
        { llmNormalizedName: 1 },
        { timestampDate: 1 },
        { durationMs: 1 },
        { 'llmNormalizedName': 1, 'testId': 1 }, // Compound index
        { 'timestampDate': 1, 'llmNormalizedName': 1 } // Compound index
      ];

      for (const index of indexes) {
        await collection.createIndex(index);
      }
      
      console.log('✅ Indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error.message);
      // Don't throw - indexes are optional
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    try {
      const collection = this.db.collection(COLLECTION_NAME);
      const totalCount = await collection.countDocuments();
      
      const llmStats = await collection.aggregate([
        {
          $group: {
            _id: '$llmNormalizedName',
            count: { $sum: 1 },
            avgDuration: { $avg: '$durationMs' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();

      console.log('\n📊 Collection Statistics:');
      console.log(`  Total records: ${totalCount}`);
      console.log('  By LLM:');
      llmStats.forEach(stat => {
        const avgDuration = stat.avgDuration ? Math.round(stat.avgDuration) : 'N/A';
        console.log(`    ${stat._id}: ${stat.count} records (avg: ${avgDuration}ms)`);
      });
      
      return { totalCount, llmStats };
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return null;
    }
  }

  /**
   * Main ingestion process
   */
  async ingestAll() {
    console.log('🚀 Starting prompt results ingestion...\n');
    
    try {
      // Connect to database
      const connected = await this.connect();
      if (!connected) {
        process.exit(1);
      }

      // Get all data files
      const dataFiles = this.getDataFiles();
      if (dataFiles.length === 0) {
        console.log('❌ No data files found');
        return;
      }

      console.log('');

      // Process each file
      let totalInserted = 0;
      for (const filePath of dataFiles) {
        try {
          const { llmName, data } = await this.loadDataFile(filePath);
          await this.insertData(data, llmName);
          totalInserted += data.length;
        } catch (error) {
          console.error(`❌ Failed to process ${filePath}:`, error.message);
          // Continue with other files
        }
      }

      // Create indexes
      console.log('');
      await this.createIndexes();

      // Show final statistics
      console.log('');
      await this.getStats();

      console.log(`\n🎉 Ingestion completed! Total records inserted: ${totalInserted}`);
      
    } catch (error) {
      console.error('❌ Ingestion failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  console.log('🚀 Main function called!');
  const args = process.argv.slice(2);
  console.log('📋 Arguments:', args);
  const ingester = new PromptResultsIngester();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 Prompt Results Ingester

Usage:
  node ingest-prompt-results.js [options]

Options:
  --help, -h     Show this help message
  --stats        Show collection statistics only
  --clear        Clear the collection before ingesting

Examples:
  node ingest-prompt-results.js           # Ingest all data
  node ingest-prompt-results.js --stats   # Show statistics only
  node ingest-prompt-results.js --clear   # Clear and reingest
`);
    return;
  }

  if (args.includes('--stats')) {
    const connected = await ingester.connect();
    if (connected) {
      await ingester.getStats();
      await ingester.disconnect();
    }
    return;
  }

  if (args.includes('--clear')) {
    console.log('🗑️  Clearing collection before ingestion...');
    const connected = await ingester.connect();
    if (connected) {
      const collection = ingester.db.collection(COLLECTION_NAME);
      const result = await collection.deleteMany({});
      console.log(`🗑️  Deleted ${result.deletedCount} existing records`);
      await ingester.disconnect();
    }
  }

  await ingester.ingestAll();
}

// Run if called directly
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
  main().catch(console.error);
} else {
  console.log('❌ Script not running as main module');
  console.log('🔧 Force running main function anyway...');
  main().catch(console.error);
}

export default PromptResultsIngester;
