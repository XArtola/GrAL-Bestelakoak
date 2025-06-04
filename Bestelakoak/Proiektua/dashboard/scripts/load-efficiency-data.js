import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

/**
 * Script to save efficiency analysis results to MongoDB
 * Integrates with the existing dashboard database structure
 * 
 * Usage: node scripts/load-efficiency-data.js
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration - reads from dashboard .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'tests';
const EFFICIENCY_COLLECTION = 'efficiency_analysis';

// Paths - look for efficiency reports in the project root
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const EFFICIENCY_REPORTS_DIR = path.join(PROJECT_ROOT, 'efficiency_reports');

async function saveEfficiencyToDatabase() {
  let client;
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📡 URI: ${MONGODB_URI}`);
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`📁 Collection: ${EFFICIENCY_COLLECTION}`);
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection(EFFICIENCY_COLLECTION);
    
    console.log('📁 Reading efficiency report files...');
    console.log(`📂 Looking in: ${EFFICIENCY_REPORTS_DIR}`);
    
    // Check if directory exists
    if (!fs.existsSync(EFFICIENCY_REPORTS_DIR)) {
      throw new Error(`Efficiency reports directory not found: ${EFFICIENCY_REPORTS_DIR}\nRun the efficiency analyzer first.`);
    }
    
    // Find the latest efficiency report
    const files = fs.readdirSync(EFFICIENCY_REPORTS_DIR);
    const jsonFiles = files.filter(file => file.startsWith('efficiency_report_') && file.endsWith('.json'));
    
    console.log(`📋 Found ${jsonFiles.length} efficiency report files:`, jsonFiles);
    
    if (jsonFiles.length === 0) {
      throw new Error('No efficiency report JSON files found. Run the efficiency analyzer first:\n  cd efficiency_alalyzer && node efficiency_analyzer.js');
    }
    
    // Get the most recent report
    const latestReport = jsonFiles.sort().reverse()[0];
    const reportPath = path.join(EFFICIENCY_REPORTS_DIR, latestReport);
    
    console.log(`📊 Processing efficiency report: ${latestReport}`);
    
    // Read and parse the efficiency report
    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    // Prepare document for MongoDB insertion
    const efficiencyDocument = {
      _id: `efficiency_${reportData.metadata.generatedAt}`,
      timestamp: new Date(reportData.metadata.generatedAt),
      reportDate: reportData.metadata.generatedAt.split('T')[0], // Extract date part
      version: reportData.metadata.analyzer,
      summary: {
        topPerformer: reportData.summary.topPerformer,
        avgEfficiencyScore: reportData.summary.avgEfficiencyScore,
        totalTestsAnalyzed: reportData.summary.totalTestsAnalyzed,
        totalLLMs: reportData.metadata.totalLLMs
      },
      weights: reportData.metadata.weights,
      rankings: reportData.rankings.map(ranking => ({
        rank: ranking.rank,
        llm: ranking.llm,
        overallScore: ranking.overallScore,
        metrics: {
          codeQuality: ranking.codeQuality,
          generationSpeed: ranking.generationSpeed,
          executionSuccess: ranking.executionSuccess,
          codeReuse: ranking.codeReuse
        },
        performance: {
          avgGenerationTime: ranking.avgGenerationTime,
          testCount: ranking.testCount,
          passRate: ranking.passRate,
          emptyCodeRatio: ranking.emptyCodeRatio
        }
      })),
      detailedMetrics: reportData.detailedMetrics,
      metadata: {
        insertedAt: new Date(),
        source: 'efficiency_analyzer',
        reportFile: latestReport,
        dashboardVersion: 'v1.0'
      }
    };
    
    console.log('💾 Saving efficiency data to MongoDB...');
    
    // Insert or replace the efficiency document
    const result = await collection.replaceOne(
      { _id: efficiencyDocument._id },
      efficiencyDocument,
      { upsert: true }
    );
    
    if (result.upsertedCount > 0) {
      console.log('✅ New efficiency document created in MongoDB');
    } else if (result.modifiedCount > 0) {
      console.log('✅ Efficiency document updated in MongoDB');
    } else {
      console.log('ℹ️  Efficiency document already exists with same content');
    }
    
    // Also create/update a "latest" document for easy frontend access
    const latestDocument = {
      ...efficiencyDocument,
      _id: 'latest_efficiency'
    };
    
    await collection.replaceOne(
      { _id: 'latest_efficiency' },
      latestDocument,
      { upsert: true }
    );
    
    console.log('✅ Latest efficiency document updated');
    
    // Display summary
    console.log('\n📈 Efficiency Analysis Summary:');
    console.log(`Top Performer: ${reportData.summary.topPerformer}`);
    console.log(`Average Efficiency Score: ${reportData.summary.avgEfficiencyScore.toFixed(4)}`);
    console.log(`Total Tests Analyzed: ${reportData.summary.totalTestsAnalyzed}`);
    console.log(`Total LLMs: ${reportData.metadata.totalLLMs}`);
    
    console.log('\n🏆 Top 3 Rankings:');
    reportData.rankings.slice(0, 3).forEach(ranking => {
      console.log(`${ranking.rank}. ${ranking.llm} - Score: ${ranking.overallScore.toFixed(4)}`);
    });
    
    console.log('\n✅ Database integration completed successfully!');
    console.log(`📍 Collection: ${DB_NAME}.${EFFICIENCY_COLLECTION}`);
    console.log(`🌐 API Endpoint: /api/efficiency`);
    
  } catch (error) {
    console.error('❌ Error saving efficiency data to database:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Create indexes for better query performance
async function createIndexes() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection(EFFICIENCY_COLLECTION);
    
    console.log('📊 Creating database indexes...');
    
    // Create indexes for efficient querying
    await collection.createIndex({ timestamp: -1 });
    await collection.createIndex({ reportDate: -1 });
    await collection.createIndex({ 'summary.topPerformer': 1 });
    await collection.createIndex({ 'rankings.llm': 1 });
    await collection.createIndex({ 'rankings.rank': 1 });
    
    console.log('✅ Database indexes created');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Check if efficiency data exists in database
async function checkEfficiencyData() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection(EFFICIENCY_COLLECTION);
    
    const count = await collection.countDocuments();
    const latest = await collection.findOne({ _id: 'latest_efficiency' });
    
    console.log(`📊 Found ${count} efficiency documents in database`);
    if (latest) {
      console.log(`📅 Latest report: ${latest.reportDate} (${latest.summary.topPerformer})`);
    }
    
    return { count, hasLatest: !!latest };
    
  } catch (error) {
    console.error('❌ Error checking efficiency data:', error.message);
    return { count: 0, hasLatest: false };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting efficiency data integration...');
  console.log('=' .repeat(60));
  
  // Check current state
  await checkEfficiencyData();
  
  console.log('=' .repeat(60));
  
  await saveEfficiencyToDatabase();
  await createIndexes();
  
  console.log('=' .repeat(60));
  console.log('🎉 Integration completed! You can now view efficiency data in the dashboard.');
  console.log('\n📖 Next steps:');
  console.log('1. Start the dashboard: npm run dev');
  console.log('2. Visit the efficiency section in the LLM comparison view');
  console.log('3. View rankings, metrics, and detailed performance data');
}

// CLI argument handling  
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    checkEfficiencyData().then(() => process.exit(0));
  } else if (args.includes('--help')) {
    console.log(`
🔧 Efficiency Data Loader

Usage:
  node scripts/load-efficiency-data.js        Load efficiency data to database
  node scripts/load-efficiency-data.js --check Check current database state
  node scripts/load-efficiency-data.js --help  Show this help

Environment variables:
  MONGODB_URI      MongoDB connection string
  MONGODB_DB_NAME  Database name (default: tests)
`);
    process.exit(0);
  } else {
    main().catch(console.error);
  }
}

module.exports = {
  saveEfficiencyToDatabase,
  createIndexes,
  checkEfficiencyData
};
