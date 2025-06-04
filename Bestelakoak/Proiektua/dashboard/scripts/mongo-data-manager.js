import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

/**
 * MongoDB Data Manager
 * Comprehensive script to store and access dashboard data from MongoDB
 * 
 * Features:
 * - Store test results from multiple LLM sources
 * - Store efficiency metrics and analysis data
 * - Provide data access functions for the dashboard frontend
 * - Handle data migration and updates
 * 
 * Usage:
 *   node scripts/mongo-data-manager.js --load-all          # Load all data types
 *   node scripts/mongo-data-manager.js --load-results      # Load test results only
 *   node scripts/mongo-data-manager.js --load-efficiency   # Load efficiency data only
 *   node scripts/mongo-data-manager.js --setup             # Setup database and indexes
 *   node scripts/mongo-data-manager.js --check             # Check database status
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'llm_dashboard';

// Collection names
const COLLECTIONS = {
  TEST_RESULTS: 'test_results',
  EFFICIENCY_METRICS: 'efficiency_metrics', 
  LLM_DATASETS: 'llm_datasets',
  EFFICIENCY_ANALYSIS: 'efficiency_analysis',
  ACTION_USAGE_ANALYSIS: 'action_usage_analysis',
  ACTION_USAGE_SUMMARY: 'action_usage_summary',
  ACTION_USAGE_COMPARISON: 'action_usage_comparison'
};

// Data paths
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(__dirname, '..', 'data');
const EFFICIENCY_REPORTS_DIR = path.join(PROJECT_ROOT, 'efficiency_reports');

/**
 * Database connection helper
 */
class DatabaseManager {
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
      
      console.log('✅ MongoDB connection established');
      return this.db;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }

  async setupDatabase() {
    try {
      console.log('🔧 Setting up database collections and indexes...');
      
      // Create collections if they don't exist
      const collections = await this.db.listCollections().toArray();
      const existingCollections = collections.map(c => c.name);

      for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
        if (!existingCollections.includes(collectionName)) {
          await this.db.createCollection(collectionName);
          console.log(`📁 Created collection: ${collectionName}`);
        }
      }

      // Create indexes for efficient querying
      await this.createIndexes();
      
      console.log('✅ Database setup completed');
    } catch (error) {
      console.error('❌ Database setup failed:', error.message);
      throw error;
    }
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');
    
    // Test Results indexes
    const testResultsCollection = this.db.collection(COLLECTIONS.TEST_RESULTS);
    await testResultsCollection.createIndex({ llm: 1 });
    await testResultsCollection.createIndex({ status: 1 });
    await testResultsCollection.createIndex({ filePath: 1 });
    await testResultsCollection.createIndex({ timestamp: -1 });
    await testResultsCollection.createIndex({ 'results.summary.tests': 1 });

    // Efficiency Metrics indexes
    const efficiencyCollection = this.db.collection(COLLECTIONS.EFFICIENCY_METRICS);
    await efficiencyCollection.createIndex({ llm: 1 });
    await efficiencyCollection.createIndex({ filePath: 1 });
    await efficiencyCollection.createIndex({ timestamp: -1 });

    // LLM Datasets indexes
    const datasetsCollection = this.db.collection(COLLECTIONS.LLM_DATASETS);
    await datasetsCollection.createIndex({ name: 1 });
    await datasetsCollection.createIndex({ timestamp: -1 });    // Efficiency Analysis indexes
    const analysisCollection = this.db.collection(COLLECTIONS.EFFICIENCY_ANALYSIS);
    await analysisCollection.createIndex({ timestamp: -1 });
    await analysisCollection.createIndex({ reportDate: -1 });
    await analysisCollection.createIndex({ 'summary.topPerformer': 1 });

    // Action Usage Analysis indexes
    const actionAnalysisCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS);
    await actionAnalysisCollection.createIndex({ llm: 1 });
    await actionAnalysisCollection.createIndex({ timestamp: -1 });
    await actionAnalysisCollection.createIndex({ 'metadata.dataType': 1 });
    await actionAnalysisCollection.createIndex({ 'actions.type': 1 });

    // Action Usage Summary indexes
    const actionSummaryCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_SUMMARY);
    await actionSummaryCollection.createIndex({ llm: 1 });
    await actionSummaryCollection.createIndex({ timestamp: -1 });
    await actionSummaryCollection.createIndex({ 'summary.totalActions': 1 });

    // Action Usage Comparison indexes
    const actionComparisonCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_COMPARISON);
    await actionComparisonCollection.createIndex({ timestamp: -1 });
    await actionComparisonCollection.createIndex({ 'comparison.baseline': 1 });
    await actionComparisonCollection.createIndex({ 'comparison.target': 1 });

    console.log('✅ Database indexes created');
  }

  async checkStatus() {
    try {
      const status = {};
      
      for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
        const collection = this.db.collection(collectionName);
        const count = await collection.countDocuments();
        const latest = await collection.findOne({}, { sort: { timestamp: -1 } });
        
        status[collectionName] = {
          count,
          latestDate: latest?.timestamp || null
        };
      }

      console.log('\n📊 Database Status:');
      Object.entries(status).forEach(([collection, info]) => {
        console.log(`📁 ${collection}: ${info.count} documents ${info.latestDate ? `(latest: ${new Date(info.latestDate).toISOString()})` : '(empty)'}`);
      });

      return status;
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      throw error;
    }
  }
}

/**
 * Test Results Data Handler
 */
class TestResultsHandler {
  constructor(db) {
    this.db = db;
    this.collection = db.collection(COLLECTIONS.TEST_RESULTS);
  }

  async loadTestResults() {
    console.log('📊 Loading test results data...');
    
    const sources = [
      {
        name: 'Original/Baseline',
        path: path.join(DATA_DIR, 'cypress-realworld-app', 'resultsOriginal.json'),
        llm: 'Original',
        version: '1.0'
      }
      // Add more sources here as they become available
      // {
      //   name: 'Claude 3.5 Sonnet',
      //   path: path.join(DATA_DIR, 'claude_3_5_sonnet', 'results.json'),
      //   llm: 'Claude 3.5 Sonnet',
      //   version: '1.0'
      // },
      // {
      //   name: 'GPT-4',
      //   path: path.join(DATA_DIR, 'gpt-4', 'results.json'),
      //   llm: 'GPT-4',
      //   version: '1.0'
      // }
    ];

    const loadedResults = [];

    for (const source of sources) {
      if (fs.existsSync(source.path)) {
        console.log(`📁 Loading ${source.name} from ${source.path}`);
        
        const data = JSON.parse(fs.readFileSync(source.path, 'utf8'));
        
        const document = {
          _id: `test_results_${source.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
          llm: source.llm,
          llmName: source.name,
          version: source.version,
          timestamp: new Date(),
          results: data.results,
          metadata: {
            source: source.name,
            filePath: source.path,
            loadedAt: new Date(),
            tool: data.results?.tool?.name || 'unknown'
          }
        };

        // Enhance individual tests with LLM information
        if (document.results?.tests) {
          document.results.tests = document.results.tests.map(test => ({
            ...test,
            llm: source.llm,
            version: source.version
          }));
        }

        await this.collection.replaceOne(
          { _id: document._id },
          document,
          { upsert: true }
        );

        // Also create/update a "latest" document for easy access
        await this.collection.replaceOne(
          { _id: `latest_${source.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')}` },
          { ...document, _id: `latest_${source.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')}` },
          { upsert: true }
        );

        loadedResults.push({
          name: source.name,
          llm: source.llm,
          tests: document.results?.tests?.length || 0,
          passed: document.results?.summary?.passed || 0,
          failed: document.results?.summary?.failed || 0
        });

        console.log(`✅ Loaded ${source.name}: ${document.results?.tests?.length || 0} tests`);
      } else {
        console.log(`⚠️  File not found: ${source.path}`);
      }
    }

    console.log(`📈 Test Results Summary: ${loadedResults.length} datasets loaded`);
    return loadedResults;
  }

  async getTestResults(llm = null) {
    try {
      const query = llm ? { llm } : {};
      const results = await this.collection.find(query).toArray();
      return results.map(doc => {
        const { _id, ...cleanData } = doc;
        return cleanData;
      });
    } catch (error) {
      console.error('❌ Error fetching test results:', error.message);
      throw error;
    }
  }

  async getLatestResults() {
    try {
      const results = await this.collection.find({ _id: /^latest_/ }).toArray();
      return results.map(doc => {
        const { _id, ...cleanData } = doc;
        return cleanData;
      });
    } catch (error) {
      console.error('❌ Error fetching latest results:', error.message);
      throw error;
    }
  }
}

/**
 * Efficiency Metrics Data Handler
 */
class EfficiencyMetricsHandler {
  constructor(db) {
    this.db = db;
    this.collection = db.collection(COLLECTIONS.EFFICIENCY_METRICS);
  }

  async loadEfficiencyMetrics() {
    console.log('📊 Loading efficiency metrics data...');
    
    const sources = [
      {
        name: 'Original/Baseline',
        path: path.join(DATA_DIR, 'cypress-realworld-app', 'test-efficiency-metrics_original_ast.json'),
        llm: 'Original',
        version: '1.0'
      }
      // Add more sources as they become available
    ];

    const loadedMetrics = [];

    for (const source of sources) {
      if (fs.existsSync(source.path)) {
        console.log(`📁 Loading ${source.name} metrics from ${source.path}`);
        
        const data = JSON.parse(fs.readFileSync(source.path, 'utf8'));
        
        const document = {
          _id: `efficiency_metrics_${source.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
          llm: source.llm,
          llmName: source.name,
          version: source.version,
          timestamp: new Date(),
          testFiles: data.testFiles,
          summary: data.summary,
          actionableCommandTypes: data.actionableCommandTypes,
          excludedCommands: data.excludedCommands,
          metadata: {
            source: source.name,
            filePath: source.path,
            loadedAt: new Date()
          }
        };

        await this.collection.replaceOne(
          { _id: document._id },
          document,
          { upsert: true }
        );

        // Create/update latest document
        await this.collection.replaceOne(
          { _id: `latest_efficiency_${source.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')}` },
          { ...document, _id: `latest_efficiency_${source.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')}` },
          { upsert: true }
        );

        loadedMetrics.push({
          name: source.name,
          llm: source.llm,
          totalTestFiles: data.summary?.totalTestFiles || 0,
          totalTestCases: data.summary?.totalTestCases || 0,
          totalActionableCommands: data.summary?.totalActionableCommands || 0
        });

        console.log(`✅ Loaded ${source.name} metrics: ${data.summary?.totalTestFiles || 0} files, ${data.summary?.totalTestCases || 0} tests`);
      } else {
        console.log(`⚠️  File not found: ${source.path}`);
      }
    }

    console.log(`📈 Efficiency Metrics Summary: ${loadedMetrics.length} datasets loaded`);
    return loadedMetrics;
  }

  async getEfficiencyMetrics(llm = null) {
    try {
      const query = llm ? { llm } : {};
      const results = await this.collection.find(query).toArray();
      return results.map(doc => {
        const { _id, ...cleanData } = doc;
        return cleanData;
      });
    } catch (error) {
      console.error('❌ Error fetching efficiency metrics:', error.message);
      throw error;
    }
  }

  async getLatestMetrics() {
    try {
      const results = await this.collection.find({ _id: /^latest_efficiency_/ }).toArray();
      return results.map(doc => {
        const { _id, ...cleanData } = doc;
        return cleanData;
      });
    } catch (error) {
      console.error('❌ Error fetching latest metrics:', error.message);
      throw error;
    }
  }
}

/**
 * LLM Datasets Handler - Combines test results and efficiency metrics
 */
class LLMDatasetsHandler {
  constructor(db) {
    this.db = db;
    this.collection = db.collection(COLLECTIONS.LLM_DATASETS);
    this.testResults = new TestResultsHandler(db);
    this.efficiencyMetrics = new EfficiencyMetricsHandler(db);
  }

  async generateCombinedDatasets() {
    console.log('🔄 Generating combined LLM datasets...');
    
    const testResults = await this.testResults.getLatestResults();
    const efficiencyMetrics = await this.efficiencyMetrics.getLatestMetrics();
    
    const colors = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];
    const datasets = [];

    for (let i = 0; i < testResults.length; i++) {
      const testData = testResults[i];
      const metricData = efficiencyMetrics.find(m => m.llm === testData.llm);

      if (testData && metricData) {
        const dataset = {
          _id: `dataset_${testData.llm.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: testData.llmName,
          llm: testData.llm,
          color: colors[i % colors.length],
          timestamp: new Date(),
          executionResults: testData.results?.tests || [],
          efficiencyMetrics: metricData.testFiles || {},
          summary: {
            totalTests: testData.results?.summary?.tests || 0,
            passedTests: testData.results?.summary?.passed || 0,
            failedTests: testData.results?.summary?.failed || 0,
            successRate: testData.results?.summary?.tests > 0 
              ? Math.round((testData.results.summary.passed / testData.results.summary.tests) * 100)
              : 0,
            totalTestFiles: metricData.summary?.totalTestFiles || 0,
            totalActionableCommands: metricData.summary?.totalActionableCommands || 0,
            avgCommandsPerTest: metricData.summary?.averageCommandsPerTest || 0
          },
          metadata: {
            source: 'combined_datasets',
            generatedAt: new Date(),
            testResultsSource: testData.metadata?.source,
            efficiencyMetricsSource: metricData.metadata?.source
          }
        };

        await this.collection.replaceOne(
          { _id: dataset._id },
          dataset,
          { upsert: true }
        );

        datasets.push(dataset);
        console.log(`✅ Generated dataset for ${dataset.name}`);
      }
    }

    // Create a "latest_combined" document for easy frontend access
    const combinedDocument = {
      _id: 'latest_combined',
      timestamp: new Date(),
      datasets: datasets.map(d => {
        const { _id, ...cleanDataset } = d;
        return cleanDataset;
      }),
      metadata: {
        generatedAt: new Date(),
        totalDatasets: datasets.length,
        source: 'combined_datasets_latest'
      }
    };

    await this.collection.replaceOne(
      { _id: 'latest_combined' },
      combinedDocument,
      { upsert: true }
    );

    console.log(`📈 Generated ${datasets.length} combined datasets`);
    return datasets;
  }

  async getCombinedDatasets() {
    try {
      const result = await this.collection.findOne({ _id: 'latest_combined' });
      return result ? result.datasets : [];
    } catch (error) {
      console.error('❌ Error fetching combined datasets:', error.message);
      throw error;
    }
  }
}

/**
 * Efficiency Analysis Handler - Handles efficiency reports
 */
class EfficiencyAnalysisHandler {
  constructor(db) {
    this.db = db;
    this.collection = db.collection(COLLECTIONS.EFFICIENCY_ANALYSIS);
  }

  async loadEfficiencyAnalysis() {
    console.log('📊 Loading efficiency analysis reports...');
    
    if (!fs.existsSync(EFFICIENCY_REPORTS_DIR)) {
      console.log(`⚠️  Efficiency reports directory not found: ${EFFICIENCY_REPORTS_DIR}`);
      console.log('💡 Run the efficiency analyzer first: cd efficiency_analyzer && node efficiency_analyzer.js');
      return [];
    }

    const files = fs.readdirSync(EFFICIENCY_REPORTS_DIR);
    const jsonFiles = files.filter(file => file.startsWith('efficiency_report_') && file.endsWith('.json'));
    
    console.log(`📋 Found ${jsonFiles.length} efficiency analysis files:`, jsonFiles);
    
    if (jsonFiles.length === 0) {
      console.log('⚠️  No efficiency analysis files found');
      return [];
    }

    const loadedReports = [];

    for (const reportFile of jsonFiles) {
      const reportPath = path.join(EFFICIENCY_REPORTS_DIR, reportFile);
      
      try {
        const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        const document = {
          _id: `efficiency_analysis_${reportData.metadata.generatedAt}`,
          timestamp: new Date(reportData.metadata.generatedAt),
          reportDate: reportData.metadata.generatedAt.split('T')[0],
          version: reportData.metadata.analyzer,
          summary: reportData.summary,
          weights: reportData.metadata.weights,
          rankings: reportData.rankings,
          detailedMetrics: reportData.detailedMetrics,
          metadata: {
            insertedAt: new Date(),
            source: 'efficiency_analyzer',
            reportFile: reportFile,
            originalPath: reportPath
          }
        };

        await this.collection.replaceOne(
          { _id: document._id },
          document,
          { upsert: true }
        );

        // Update latest document
        await this.collection.replaceOne(
          { _id: 'latest_efficiency_analysis' },
          { ...document, _id: 'latest_efficiency_analysis' },
          { upsert: true }
        );

        loadedReports.push({
          file: reportFile,
          date: document.reportDate,
          topPerformer: reportData.summary?.topPerformer,
          totalLLMs: reportData.metadata?.totalLLMs
        });

        console.log(`✅ Loaded analysis report: ${reportFile}`);
      } catch (error) {
        console.error(`❌ Error loading ${reportFile}:`, error.message);
      }
    }

    console.log(`📈 Efficiency Analysis Summary: ${loadedReports.length} reports loaded`);
    return loadedReports;
  }

  async getLatestAnalysis() {
    try {
      const result = await this.collection.findOne({ _id: 'latest_efficiency_analysis' });
      if (result) {
        const { _id, ...cleanData } = result;
        return cleanData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching latest analysis:', error.message);
      throw error;
    }
  }
}

/**
 * Main Data Manager Class
 */
class MongoDataManager {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.testResults = null;
    this.efficiencyMetrics = null;
    this.llmDatasets = null;
    this.efficiencyAnalysis = null;
  }

  async initialize() {
    const db = await this.dbManager.connect();
    
    this.testResults = new TestResultsHandler(db);
    this.efficiencyMetrics = new EfficiencyMetricsHandler(db);
    this.llmDatasets = new LLMDatasetsHandler(db);
    this.efficiencyAnalysis = new EfficiencyAnalysisHandler(db);
    
    return this;
  }

  async loadAllData() {
    console.log('🚀 Loading all data to MongoDB...\n');
    
    const results = {
      testResults: await this.testResults.loadTestResults(),
      efficiencyMetrics: await this.efficiencyMetrics.loadEfficiencyMetrics(),
      efficiencyAnalysis: await this.efficiencyAnalysis.loadEfficiencyAnalysis()
    };

    // Generate combined datasets after loading individual data
    results.combinedDatasets = await this.llmDatasets.generateCombinedDatasets();

    console.log('\n🎉 All data loaded successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • Test Results: ${results.testResults.length} datasets`);
    console.log(`   • Efficiency Metrics: ${results.efficiencyMetrics.length} datasets`);
    console.log(`   • Efficiency Analysis: ${results.efficiencyAnalysis.length} reports`);
    console.log(`   • Combined Datasets: ${results.combinedDatasets.length} datasets`);

    return results;
  }

  async loadTestResults() {
    return await this.testResults.loadTestResults();
  }

  async loadEfficiencyData() {
    const metrics = await this.efficiencyMetrics.loadEfficiencyMetrics();
    const analysis = await this.efficiencyAnalysis.loadEfficiencyAnalysis();
    return { metrics, analysis };
  }

  async setupDatabase() {
    return await this.dbManager.setupDatabase();
  }

  async checkStatus() {
    return await this.dbManager.checkStatus();
  }

  async disconnect() {
    await this.dbManager.disconnect();
  }

  // Data access methods for the frontend
  async getTestResults(llm = null) {
    return await this.testResults.getTestResults(llm);
  }

  async getLatestTestResults() {
    return await this.testResults.getLatestResults();
  }

  async getEfficiencyMetrics(llm = null) {
    return await this.efficiencyMetrics.getEfficiencyMetrics(llm);
  }

  async getLatestEfficiencyMetrics() {
    return await this.efficiencyMetrics.getLatestMetrics();
  }

  async getCombinedDatasets() {
    return await this.llmDatasets.getCombinedDatasets();
  }

  async getLatestEfficiencyAnalysis() {
    return await this.efficiencyAnalysis.getLatestAnalysis();
  }
}

/**
 * CLI Interface
 */
async function main() {
  const manager = new MongoDataManager();
  
  try {
    await manager.initialize();
    
    const args = process.argv.slice(2);
    
    if (args.includes('--setup')) {
      console.log('🔧 Setting up database...');
      await manager.setupDatabase();
      
    } else if (args.includes('--check')) {
      console.log('🔍 Checking database status...');
      await manager.checkStatus();
      
    } else if (args.includes('--load-results')) {
      console.log('📊 Loading test results...');
      await manager.loadTestResults();
      
    } else if (args.includes('--load-efficiency')) {
      console.log('📊 Loading efficiency data...');
      await manager.loadEfficiencyData();
      
    } else if (args.includes('--load-all')) {
      console.log('🚀 Loading all data...');
      await manager.loadAllData();
      
    } else if (args.includes('--help')) {
      console.log(`
🔧 MongoDB Data Manager

Usage:
  node scripts/mongo-data-manager.js --load-all          Load all data types
  node scripts/mongo-data-manager.js --load-results      Load test results only
  node scripts/mongo-data-manager.js --load-efficiency   Load efficiency data only
  node scripts/mongo-data-manager.js --setup             Setup database and indexes
  node scripts/mongo-data-manager.js --check             Check database status
  node scripts/mongo-data-manager.js --help              Show this help

Environment variables:
  MONGODB_URI         MongoDB connection string
  MONGODB_DB_NAME     Database name (default: llm_dashboard)

Examples:
  # Setup database for first time
  node scripts/mongo-data-manager.js --setup

  # Load all available data
  node scripts/mongo-data-manager.js --load-all

  # Check what's in the database
  node scripts/mongo-data-manager.js --check
`);
      
    } else {
      console.log('🚀 Loading all data (default action)...');
      await manager.setupDatabase();
      await manager.loadAllData();
    }
    
  } catch (error) {
    console.error('💥 Operation failed:', error.message);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

// Export the manager class for use in other modules
export { MongoDataManager, DatabaseManager, TestResultsHandler, EfficiencyMetricsHandler, LLMDatasetsHandler, EfficiencyAnalysisHandler };

// Run CLI if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
