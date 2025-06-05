/**
 * Save Merged Test Data to MongoDB Collection
 * 
 * This script reads merged test data files from the OUTPUT_DIR and saves them
 * to a MongoDB collection. Each LLM's merged data is stored as a separate document
 * with comprehensive test execution and efficiency metrics.
 * 
 * Usage:
 *   node scripts/save-to-database.js --llm claude_3_5_sonnet    # Save specific LLM data
 *   node scripts/save-to-database.js --all                     # Save all LLM data
 *   node scripts/save-to-database.js --reset                   # Clear collection and resave all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Database script initialization...');
console.log(`📄 Script file: ${__filename}`);
console.log(`📁 Script directory: ${__dirname}`);

// Define paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_DIR = path.join(DATA_DIR, 'test_execution_results', 'merged_results');

console.log(`📂 Configured paths:`);
console.log(`   DATA_DIR: ${DATA_DIR}`);
console.log(`   OUTPUT_DIR: ${OUTPUT_DIR}`);

// MongoDB configuration
const MONGODB_CONFIG = {
    // Connection URI - can be overridden by environment variable
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    
    // Database and collection names
    database: process.env.MONGODB_DATABASE || 'tests',
    collection: process.env.MONGODB_COLLECTION || 'merged_test_data',
    
    // Connection options
    options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }
};

console.log(`🔗 MongoDB Configuration:`);
console.log(`   URI: ${MONGODB_CONFIG.uri}`);
console.log(`   Database: ${MONGODB_CONFIG.database}`);
console.log(`   Collection: ${MONGODB_CONFIG.collection}`);

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
    console.log('🔌 Connecting to MongoDB...');
    
    try {
        const client = new MongoClient(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
        await client.connect();
        
        console.log('✅ Successfully connected to MongoDB');
        
        const db = client.db(MONGODB_CONFIG.database);
        const collection = db.collection(MONGODB_CONFIG.collection);
        
        return { client, db, collection };
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        throw error;
    }
}

/**
 * Get all merged data files from the output directory
 */
function getMergedDataFiles() {
    console.log(`🔍 Scanning for merged data files in: ${OUTPUT_DIR}`);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.error(`❌ Output directory does not exist: ${OUTPUT_DIR}`);
        return [];
    }
    
    const files = fs.readdirSync(OUTPUT_DIR)
        .filter(file => file.startsWith('merged-test-data_') && file.endsWith('.json'))
        .map(file => {
            const fullPath = path.join(OUTPUT_DIR, file);
            const llmKey = file.replace('merged-test-data_', '').replace('.json', '');
            return { file, fullPath, llmKey };
        });
    
    console.log(`📄 Found ${files.length} merged data files:`);
    files.forEach(({ file, llmKey }) => {
        console.log(`   - ${file} (LLM: ${llmKey})`);
    });
    
    return files;
}

/**
 * Read and parse a merged data file
 */
function readMergedDataFile(filePath) {
    console.log(`📖 Reading merged data file: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        console.log(`✅ Successfully parsed data for LLM: ${data.llm}`);
        console.log(`   - Total tests: ${data.metadata?.totalTests || 'unknown'}`);
        console.log(`   - Merged tests: ${data.metadata?.mergedTests || 'unknown'}`);
        console.log(`   - Timestamp: ${data.timestamp || 'unknown'}`);
        
        return data;
    } catch (error) {
        console.error(`❌ Failed to read/parse file ${filePath}:`, error.message);
        throw error;
    }
}

/**
 * Transform merged data for database storage
 */
function transformDataForDatabase(mergedData) {
    console.log(`🔄 Transforming data for database storage...`);
    
    // Add database-specific metadata
    const transformedData = {
        ...mergedData,
        
        // Database metadata
        _id: `merged_test_data_${mergedData.llm}`,
        insertedAt: new Date(),
        version: '1.0',
        
        // Enhanced metadata
        metadata: {
            ...mergedData.metadata,
            processingInfo: {
                originalTimestamp: mergedData.timestamp,
                databaseInsertTimestamp: new Date().toISOString(),
                dataVersion: '1.0'
            }
        },
        
        // Add computed statistics
        statistics: {
            execution: {
                totalTests: mergedData.summary?.execution?.tests || 0,
                passRate: mergedData.summary?.execution?.tests ? 
                    ((mergedData.summary.execution.passed || 0) / mergedData.summary.execution.tests * 100).toFixed(2) : 0,
                failRate: mergedData.summary?.execution?.tests ? 
                    ((mergedData.summary.execution.failed || 0) / mergedData.summary.execution.tests * 100).toFixed(2) : 0,
                averageDuration: calculateAverageDuration(mergedData.tests || [])
            },
            efficiency: {
                totalTestFiles: mergedData.summary?.efficiency?.totalTestFiles || 0,
                totalTestCases: mergedData.summary?.efficiency?.totalTestCases || 0,
                totalActionableCommands: mergedData.summary?.efficiency?.totalActionableCommands || 0,
                averageCommandsPerTest: mergedData.summary?.efficiency?.averageCommandsPerTest || 0,
                mergeSuccessRate: mergedData.metadata?.totalTests ? 
                    ((mergedData.metadata.mergedTests || 0) / mergedData.metadata.totalTests * 100).toFixed(2) : 0
            }
        }
    };
    
    console.log(`✅ Data transformation completed`);
    console.log(`   - Pass rate: ${transformedData.statistics.execution.passRate}%`);
    console.log(`   - Merge success rate: ${transformedData.statistics.efficiency.mergeSuccessRate}%`);
    
    return transformedData;
}

/**
 * Calculate average test duration
 */
function calculateAverageDuration(tests) {
    if (!tests || tests.length === 0) return 0;
    
    const validDurations = tests
        .filter(test => test.execution?.duration && typeof test.execution.duration === 'number')
        .map(test => test.execution.duration);
    
    if (validDurations.length === 0) return 0;
    
    const average = validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length;
    return Math.round(average);
}

/**
 * Save data to MongoDB collection
 */
async function saveToDatabase(collection, data, options = {}) {
    const { replaceExisting = true } = options;
    
    console.log(`💾 Saving data to database for LLM: ${data.llm}`);
    
    try {
        if (replaceExisting) {
            // Use upsert to replace existing document
            const result = await collection.replaceOne(
                { _id: data._id },
                data,
                { upsert: true }
            );
            
            if (result.upsertedCount > 0) {
                console.log(`✅ Inserted new document for LLM: ${data.llm}`);
            } else if (result.modifiedCount > 0) {
                console.log(`✅ Updated existing document for LLM: ${data.llm}`);
            } else {
                console.log(`ℹ️  No changes needed for LLM: ${data.llm}`);
            }
        } else {
            // Insert only if doesn't exist
            const existingDoc = await collection.findOne({ _id: data._id });
            if (existingDoc) {
                console.log(`⚠️  Document already exists for LLM: ${data.llm}, skipping...`);
                return { skipped: true };
            }
            
            const result = await collection.insertOne(data);
            console.log(`✅ Inserted new document for LLM: ${data.llm}`);
        }
        
        return { success: true };
    } catch (error) {
        console.error(`❌ Failed to save data for LLM ${data.llm}:`, error.message);
        throw error;
    }
}

/**
 * Clear the entire collection
 */
async function clearCollection(collection) {
    console.log('🗑️  Clearing collection...');
    
    try {
        const result = await collection.deleteMany({});
        console.log(`✅ Cleared ${result.deletedCount} documents from collection`);
        return result;
    } catch (error) {
        console.error('❌ Failed to clear collection:', error.message);
        throw error;
    }
}

/**
 * Create indexes for better query performance
 */
async function createIndexes(collection) {
    console.log('🔍 Creating database indexes...');
    
    try {
        const indexes = [
            { llm: 1 },
            { 'metadata.totalTests': 1 },
            { 'summary.execution.tests': 1 },
            { 'summary.execution.passed': 1 },
            { 'summary.execution.failed': 1 },
            { 'statistics.execution.passRate': 1 },
            { insertedAt: 1 },
            { timestamp: 1 }
        ];
        
        for (const index of indexes) {
            await collection.createIndex(index);
        }
        
        console.log(`✅ Created ${indexes.length} indexes`);
    } catch (error) {
        console.error('❌ Failed to create indexes:', error.message);
        // Don't throw - indexes are nice to have but not critical
    }
}

/**
 * Process a single LLM's data
 */
async function processSingleLLM(collection, llmKey, options = {}) {
    const files = getMergedDataFiles();
    const targetFile = files.find(f => f.llmKey === llmKey);
    
    if (!targetFile) {
        console.error(`❌ No merged data file found for LLM: ${llmKey}`);
        console.log(`Available LLMs: ${files.map(f => f.llmKey).join(', ')}`);
        return false;
    }
    
    const mergedData = readMergedDataFile(targetFile.fullPath);
    const transformedData = transformDataForDatabase(mergedData);
    await saveToDatabase(collection, transformedData, options);
    
    return true;
}

/**
 * Process all available LLM data
 */
async function processAllLLMs(collection, options = {}) {
    const files = getMergedDataFiles();
    
    if (files.length === 0) {
        console.error('❌ No merged data files found');
        return false;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
        try {
            console.log(`\n📊 Processing LLM: ${file.llmKey}`);
            const mergedData = readMergedDataFile(file.fullPath);
            const transformedData = transformDataForDatabase(mergedData);
            await saveToDatabase(collection, transformedData, options);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to process LLM ${file.llmKey}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`\n📈 Processing completed:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    
    return successCount > 0;
}

/**
 * Get collection statistics
 */
async function getCollectionStats(collection) {
    console.log('\n📊 Collection Statistics:');
    
    try {
        const totalDocs = await collection.countDocuments();
        console.log(`   📄 Total documents: ${totalDocs}`);
        
        if (totalDocs > 0) {
            const llms = await collection.distinct('llm');
            console.log(`   🤖 LLMs in collection: ${llms.join(', ')}`);
            
            const stats = await collection.aggregate([
                {
                    $group: {
                        _id: null,
                        avgPassRate: { $avg: { $toDouble: '$statistics.execution.passRate' } },
                        avgMergeRate: { $avg: { $toDouble: '$statistics.efficiency.mergeSuccessRate' } },
                        totalTests: { $sum: '$summary.execution.tests' },
                        totalPassed: { $sum: '$summary.execution.passed' },
                        totalFailed: { $sum: '$summary.execution.failed' }
                    }
                }
            ]).toArray();
            
            if (stats.length > 0) {
                const stat = stats[0];
                console.log(`   📈 Overall pass rate: ${stat.avgPassRate?.toFixed(2) || 0}%`);
                console.log(`   🔗 Overall merge rate: ${stat.avgMergeRate?.toFixed(2) || 0}%`);
                console.log(`   🧪 Total tests across all LLMs: ${stat.totalTests || 0}`);
                console.log(`   ✅ Total passed: ${stat.totalPassed || 0}`);
                console.log(`   ❌ Total failed: ${stat.totalFailed || 0}`);
            }
        }
    } catch (error) {
        console.error('❌ Failed to get collection stats:', error.message);
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('\n🚀 Starting database save operation...');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const llmArg = args.find(arg => arg.startsWith('--llm='));
    const llmKey = llmArg ? llmArg.split('=')[1] : null;
    const isAll = args.includes('--all');
    const isReset = args.includes('--reset');
    const isStats = args.includes('--stats');
    
    if (!llmKey && !isAll && !isReset && !isStats) {
        console.log('📖 Usage:');
        console.log('   node scripts/save-to-database.js --llm=claude_3_5_sonnet');
        console.log('   node scripts/save-to-database.js --all');
        console.log('   node scripts/save-to-database.js --reset');
        console.log('   node scripts/save-to-database.js --stats');
        console.log('\n🔍 Available LLMs:');
        const files = getMergedDataFiles();
        files.forEach(f => console.log(`   - ${f.llmKey}`));
        return;
    }
    
    let client, collection;
    
    try {
        // Connect to database
        const dbConnection = await connectToMongoDB();
        client = dbConnection.client;
        collection = dbConnection.collection;
        
        // Create indexes
        await createIndexes(collection);
        
        // Handle reset operation
        if (isReset) {
            await clearCollection(collection);
        }
        
        // Handle stats operation
        if (isStats) {
            await getCollectionStats(collection);
            return;
        }
        
        // Process data based on arguments
        let success = false;
        
        if (llmKey) {
            success = await processSingleLLM(collection, llmKey, { replaceExisting: !isReset });
        } else if (isAll || isReset) {
            success = await processAllLLMs(collection, { replaceExisting: !isReset });
        }
        
        if (success) {
            console.log('\n✅ Database operation completed successfully!');
            await getCollectionStats(collection);
        } else {
            console.log('\n❌ Database operation failed');
        }
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            console.log('\n🔌 Closing database connection...');
            await client.close();
            console.log('✅ Database connection closed');
        }
    }
}

// Check if script is being run directly
const currentUrl = new URL(import.meta.url);
const isMainModule = process.argv[1] === fileURLToPath(currentUrl);

console.log(`🔍 Module check:`);
console.log(`   Current URL: ${currentUrl.href}`);
console.log(`   Process argv[1]: ${process.argv[1]}`);
console.log(`   Is main module: ${isMainModule}`);

if (isMainModule) {
    console.log('🎯 Running as main module, executing main()...');
    main().catch(error => {
        console.error('💥 Unhandled error in main():', error);
        process.exit(1);
    });
} else {
    console.log('📦 Loaded as module, main() not executed');
}

// Export functions for potential use as module
export {
    connectToMongoDB,
    getMergedDataFiles,
    readMergedDataFile,
    transformDataForDatabase,
    saveToDatabase,
    clearCollection,
    createIndexes,
    processSingleLLM,
    processAllLLMs,
    getCollectionStats,
    MONGODB_CONFIG
};
