console.log('🔥 ACTION USAGE ANALYSIS SCRIPT STARTED!');
console.log('📅 Script execution time:', new Date().toISOString());

console.log('📦 Attempting to import modules...');

// Import modules at top level
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

console.log('✅ All modules imported successfully');

/**
 * Action Usage Analysis for LLMs
 * 
 * This script processes test execution results and efficiency metrics to create
 * comprehensive action usage analysis for different LLMs, using "original" as baseline.
 * 
 * Features:
 * - Process test execution results from executed_tests_results folder
 * - Process test efficiency metrics from test_eficcency_metrics folder  
 * - Create comparative analysis using "original" as baseline
 * - Store results in new action_usage_analysis collection
 * - Generate action usage statistics and patterns
 * 
 * Usage:
 *   node scripts/action-usage-analysis.js --process-all      # Process all LLM data
 *   node scripts/action-usage-analysis.js --setup           # Setup collection and indexes
 *   node scripts/action-usage-analysis.js --analysis        # Generate analysis reports
 *   node scripts/action-usage-analysis.js --check           # Check current data status
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📂 Setting up paths and constants...');

// Database configuration
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'tests';

console.log('📊 Database config loaded:', { MONGODB_URI, DB_NAME });

// Collection names
const COLLECTIONS = {
  MERGED_TEST_DATA: 'merged_test_data',
  ACTION_USAGE_ANALYSIS: 'action_usage_analysis',
  ACTION_USAGE_SUMMARY: 'action_usage_summary',
  ACTION_USAGE_COMPARISON: 'action_usage_comparison'
};

// Data paths
const DATA_DIR = path.join(__dirname, '..', 'data', 'test_execution_results');
const EXECUTED_TESTS_DIR = path.join(DATA_DIR, 'executed_tests_results');
const EFFICIENCY_METRICS_DIR = path.join(DATA_DIR, 'test_eficcency_metrics');

// LLM mapping for consistent naming
const LLM_MAPPING = {
  'original': 'Original (Baseline)',
  'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
  'claude_3_7_sonnet': 'Claude 3.7 Sonnet', 
  'claude_3_7_sonnet_thinking': 'Claude 3.7 Sonnet Thinking',
  'claude_sonnet_4': 'Claude Sonnet 4',
  'gemini_2_0_flash': 'Gemini 2.0 Flash',  'gemini_2_5_pro_preview': 'Gemini 2.5 Pro (Preview)',
  'gpt_4_1': 'GPT-4.1',
  'gpt_4o': 'GPT-4o',
  'o1_preview': 'o1 (Preview)',
  'o3_mini': 'o3-mini',
  'o4_mini_preview': 'o4-mini (Preview)'
};

/**
 * Action Usage Analysis Manager
 */
class ActionUsageAnalysisManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.baselineData = null;
  }
  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB for Action Usage Analysis...');
      console.log(`📡 URI: ${MONGODB_URI}`);
      console.log(`📊 Database: ${DB_NAME}`);
      console.log('🕐 Attempting MongoDB connection...');
      
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      console.log('🔗 Client connected, selecting database...');
      
      this.db = this.client.db(DB_NAME);
      console.log('✅ MongoDB connection established successfully');
      
      // Test the connection
      await this.db.admin().ping();
      console.log('🏓 Database ping successful');
      
      return this.db;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.error('🔍 Full error details:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
  async setupCollections() {
    try {
      console.log('🔧 Setting up Action Usage Analysis collections...');
      console.log('📋 Listing existing collections...');
      
      // Create collections if they don't exist
      const collections = await this.db.listCollections().toArray();
      const existingCollections = collections.map(c => c.name);
      console.log(`📁 Found ${collections.length} existing collections:`, existingCollections);

      for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
        console.log(`🔍 Checking collection: ${collectionName}`);
        if (!existingCollections.includes(collectionName)) {
          console.log(`📁 Creating collection: ${collectionName}`);
          await this.db.createCollection(collectionName);
          console.log(`✅ Created collection: ${collectionName}`);
        } else {
          console.log(`✅ Collection already exists: ${collectionName}`);
        }
      }

      // Create indexes for efficient querying
      await this.createIndexes();
      
      console.log('✅ Action Usage Analysis collections setup completed');
    } catch (error) {
      console.error('❌ Collections setup failed:', error.message);
      console.error('🔍 Full error details:', error);
      throw error;
    }
  }

  async createIndexes() {
    console.log('📊 Creating Action Usage Analysis indexes...');
    
    // Action Usage Analysis indexes
    const analysisCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS);
    await analysisCollection.createIndex({ llm: 1 });
    await analysisCollection.createIndex({ timestamp: -1 });
    await analysisCollection.createIndex({ 'metadata.dataType': 1 });
    await analysisCollection.createIndex({ 'actions.type': 1 });

    // Action Usage Summary indexes
    const summaryCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_SUMMARY);
    await summaryCollection.createIndex({ llm: 1 });
    await summaryCollection.createIndex({ timestamp: -1 });
    await summaryCollection.createIndex({ 'summary.totalActions': 1 });

    // Action Usage Comparison indexes
    const comparisonCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_COMPARISON);
    await comparisonCollection.createIndex({ timestamp: -1 });
    await comparisonCollection.createIndex({ 'comparison.baseline': 1 });
    await comparisonCollection.createIndex({ 'comparison.target': 1 });

    console.log('✅ Action Usage Analysis indexes created');
  }

  /**
   * Load and process baseline data (original)
   */  async loadBaselineData() {
    console.log('📊 Loading baseline data (original)...');
    console.log(`🔍 Looking for baseline files in:`);
    console.log(`   📁 Executed tests: ${EXECUTED_TESTS_DIR}`);
    console.log(`   📁 Efficiency metrics: ${EFFICIENCY_METRICS_DIR}`);
    
    const executedTestsPath = path.join(EXECUTED_TESTS_DIR, 'results_original.json');
    const efficiencyMetricsPath = path.join(EFFICIENCY_METRICS_DIR, 'test-efficiency-metrics_original.json');

    console.log(`🔍 Checking baseline files:`);
    console.log(`   📄 ${executedTestsPath} - ${fs.existsSync(executedTestsPath) ? 'EXISTS' : 'NOT FOUND'}`);
    console.log(`   📄 ${efficiencyMetricsPath} - ${fs.existsSync(efficiencyMetricsPath) ? 'EXISTS' : 'NOT FOUND'}`);

    if (!fs.existsSync(executedTestsPath) || !fs.existsSync(efficiencyMetricsPath)) {
      throw new Error('Baseline files not found. Both results_original.json and test-efficiency-metrics_original.json are required.');
    }

    console.log('📖 Reading baseline files...');
    const executedResults = JSON.parse(fs.readFileSync(executedTestsPath, 'utf8'));
    const efficiencyMetrics = JSON.parse(fs.readFileSync(efficiencyMetricsPath, 'utf8'));    console.log(`📊 Baseline data loaded:`);
    console.log(`   🧪 Executed results: ${executedResults.results?.summary?.tests || 0} tests`);
    console.log(`   📈 Efficiency metrics: ${efficiencyMetrics.testFiles ? Object.keys(efficiencyMetrics.testFiles).length : 0} test files`);

    this.baselineData = {
      executedResults,
      efficiencyMetrics,
      llm: 'original',
      displayName: LLM_MAPPING['original']
    };

    console.log('✅ Baseline data loaded successfully');
    return this.baselineData;
  }

  /**
   * Process all LLM data files
   */  async processAllLLMData() {
    console.log('🔄 Processing all LLM data for Action Usage Analysis...');
    console.log(`🔍 Scanning directory: ${EXECUTED_TESTS_DIR}`);
    
    // Load baseline first
    await this.loadBaselineData();

    const processedLLMs = [];
    
    // Get all LLM files
    const executedFiles = fs.readdirSync(EXECUTED_TESTS_DIR)
      .filter(file => file.startsWith('results_') && file.endsWith('.json'));
    
    console.log(`📁 Found ${executedFiles.length} executed test files:`, executedFiles);

    for (const file of executedFiles) {
      const llmKey = file.replace('results_', '').replace('.json', '');
      const efficiencyFile = `test-efficiency-metrics_${llmKey}.json`;
      const efficiencyPath = path.join(EFFICIENCY_METRICS_DIR, efficiencyFile);
      
      console.log(`🔍 Checking LLM: ${llmKey}`);
      console.log(`   📄 Executed tests file: ${file}`);
      console.log(`   📄 Efficiency metrics file: ${efficiencyFile} - ${fs.existsSync(efficiencyPath) ? 'EXISTS' : 'NOT FOUND'}`);
      
      if (fs.existsSync(efficiencyPath)) {
        console.log(`📁 Processing ${LLM_MAPPING[llmKey] || llmKey}...`);
        
        const result = await this.processLLMData(llmKey);
        processedLLMs.push(result);
        console.log(`✅ Completed processing ${LLM_MAPPING[llmKey] || llmKey}`);
      } else {
        console.warn(`⚠️ Efficiency metrics file not found for ${llmKey}: ${efficiencyFile}`);
      }
    }

    console.log(`✅ Processed ${processedLLMs.length} LLMs for Action Usage Analysis`);
    return processedLLMs;
  }

  /**
   * Process individual LLM data
   */  async processLLMData(llmKey) {
    console.log(`🔍 Processing individual LLM: ${llmKey}`);
    const executedTestsPath = path.join(EXECUTED_TESTS_DIR, `results_${llmKey}.json`);
    const efficiencyMetricsPath = path.join(EFFICIENCY_METRICS_DIR, `test-efficiency-metrics_${llmKey}.json`);

    console.log(`📖 Reading files for ${llmKey}:`);
    console.log(`   📄 ${executedTestsPath}`);
    console.log(`   📄 ${efficiencyMetricsPath}`);

    const executedResults = JSON.parse(fs.readFileSync(executedTestsPath, 'utf8'));
    const efficiencyMetrics = JSON.parse(fs.readFileSync(efficiencyMetricsPath, 'utf8'));    console.log(`📊 Data summary for ${llmKey}:`);
    console.log(`   🧪 Tests: ${executedResults.results?.summary?.tests || 0}`);
    console.log(`   📈 Test files: ${efficiencyMetrics.testFiles ? Object.keys(efficiencyMetrics.testFiles).length : 0}`);

    // Extract action usage patterns
    console.log(`🔍 Analyzing action usage for ${llmKey}...`);
    const actionAnalysis = this.analyzeActionUsage(executedResults, efficiencyMetrics, llmKey);
    
    // Compare with baseline
    console.log(`🔍 Comparing ${llmKey} with baseline...`);
    const comparisonAnalysis = this.compareWithBaseline(actionAnalysis, llmKey);    // Store in database
    console.log(`💾 Storing action analysis for ${llmKey}...`);
    await this.storeActionAnalysis(executedResults, efficiencyMetrics, llmKey);
    
    if (comparisonAnalysis) {
      console.log(`💾 Storing comparison analysis for ${llmKey}...`);
      await this.storeComparisonAnalysis(comparisonAnalysis, llmKey);
    }

    console.log(`✅ Successfully processed ${llmKey}`);
    return {
      llm: llmKey,
      displayName: LLM_MAPPING[llmKey] || llmKey,
      actionAnalysis,
      comparisonAnalysis
    };
  }

  /**
   * Analyze action usage from test results and efficiency metrics
   */  analyzeActionUsage(executedResults, efficiencyMetrics, llmKey) {
    console.log(`🔍 Starting action analysis for ${llmKey}...`);
    
    const analysis = {
      llm: llmKey,
      displayName: LLM_MAPPING[llmKey] || llmKey,
      timestamp: new Date(),
      actions: {
        total: 0,
        byType: {},
        byTest: [],
        patterns: {}
      },
      efficiency: {
        totalTests: 0,
        totalCommands: 0,
        commandsPerTest: 0,
        avgExecutionTime: 0
      },
      execution: {
        totalTests: executedResults.results?.summary?.tests || 0,
        passed: executedResults.results?.summary?.passed || 0,
        failed: executedResults.results?.summary?.failed || 0,
        passRate: 0,
        avgDuration: 0
      }
    };

    console.log(`📊 Initial execution data for ${llmKey}:`);
    console.log(`   Total tests: ${analysis.execution.totalTests}`);
    console.log(`   Passed: ${analysis.execution.passed}`);
    console.log(`   Failed: ${analysis.execution.failed}`);    // Process efficiency metrics for action analysis
    if (efficiencyMetrics.testFiles) {
      console.log(`📈 Processing ${Object.keys(efficiencyMetrics.testFiles).length} test files for efficiency metrics...`);
      
      for (const [filePath, testFile] of Object.entries(efficiencyMetrics.testFiles)) {
        console.log(`   📄 Processing test file: ${filePath}`);
        analysis.efficiency.totalTests += testFile.totalTests || 0;
        
        if (testFile.tests) {
          console.log(`   📄 Processing ${Object.keys(testFile.tests).length} tests in ${filePath}`);
          
          for (const [testName, test] of Object.entries(testFile.tests)) {
            const testAnalysis = {
              filePath: filePath,
              orderInFile: test.orderInFile,
              actionableCommands: test.actionableCommands || 0,
              commands: test.commands || []
            };

            // Count command types
            if (test.commands) {
              console.log(`      🔍 Analyzing ${test.commands.length} commands for test ${test.orderInFile}`);
              for (const command of test.commands) {
                const commandType = this.categorizeCommand(command);
                analysis.actions.byType[commandType] = (analysis.actions.byType[commandType] || 0) + 1;
                analysis.actions.total++;
              }
            }

            analysis.actions.byTest.push(testAnalysis);
            analysis.efficiency.totalCommands += test.actionableCommands || 0;
          }
        }
      }
    } else {
      console.warn(`⚠️ No testFiles found in efficiency metrics for ${llmKey}`);
    }

    console.log(`📊 Action analysis summary for ${llmKey}:`);
    console.log(`   Total actions: ${analysis.actions.total}`);
    console.log(`   Total commands: ${analysis.efficiency.totalCommands}`);
    console.log(`   Action types:`, Object.keys(analysis.actions.byType));

    // Process execution results
    if (executedResults.results?.tests) {
      console.log(`🧪 Processing ${executedResults.results.tests.length} test results for duration analysis...`);
      const durations = executedResults.results.tests
        .map(test => test.duration || 0)
        .filter(duration => duration > 0);
      
      if (durations.length > 0) {
        analysis.execution.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        console.log(`   ⏱️ Average duration: ${analysis.execution.avgDuration.toFixed(2)}ms`);
      }
    }

    // Calculate derived metrics
    if (analysis.efficiency.totalTests > 0) {
      analysis.efficiency.commandsPerTest = analysis.efficiency.totalCommands / analysis.efficiency.totalTests;
      console.log(`   📈 Commands per test: ${analysis.efficiency.commandsPerTest.toFixed(2)}`);
    }

    if (analysis.execution.totalTests > 0) {
      analysis.execution.passRate = (analysis.execution.passed / analysis.execution.totalTests) * 100;
      console.log(`   ✅ Pass rate: ${analysis.execution.passRate.toFixed(2)}%`);
    }

    // Identify patterns
    console.log(`🔍 Identifying action patterns for ${llmKey}...`);
    analysis.actions.patterns = this.identifyActionPatterns(analysis.actions.byType, analysis.actions.byTest);

    console.log(`✅ Action analysis completed for ${llmKey}`);
    return analysis;
  }

  /**
   * Categorize commands into action types
   */  categorizeCommand(command) {
    if (!command || typeof command !== 'string') {
      console.log(`⚠️ Invalid command: ${command} (type: ${typeof command})`);
      return 'unknown';
    }
    
    const cmd = command.toLowerCase();
    
    // Navigation actions
    if (cmd.includes('visit') || cmd.includes('go') || cmd.includes('navigate')) return 'navigation';
    
    // Click actions
    if (cmd.includes('click') || cmd.includes('tap')) return 'interaction_click';
    
    // Input actions
    if (cmd.includes('type') || cmd.includes('input') || cmd.includes('fill')) return 'interaction_input';
    
    // Assertion actions
    if (cmd.includes('should') || cmd.includes('expect') || cmd.includes('assert')) return 'assertion';
    
    // Wait actions
    if (cmd.includes('wait') || cmd.includes('timeout')) return 'wait';
    
    // Get/Find actions
    if (cmd.includes('get') || cmd.includes('find') || cmd.includes('contains')) return 'selection';
    
    // Form actions
    if (cmd.includes('submit') || cmd.includes('form')) return 'form_interaction';
    
    // API actions
    if (cmd.includes('request') || cmd.includes('intercept') || cmd.includes('api')) return 'api_interaction';
    
    return 'other';
  }

  /**
   * Identify action usage patterns
   */
  identifyActionPatterns(actionsByType, actionsByTest) {
    const patterns = {
      mostUsedActions: [],
      leastUsedActions: [],
      actionDistribution: {},
      testComplexity: {
        simple: 0,    // 1-5 actions
        medium: 0,    // 6-15 actions  
        complex: 0    // 16+ actions
      }
    };

    // Sort actions by usage
    const sortedActions = Object.entries(actionsByType)
      .sort(([,a], [,b]) => b - a);
    
    patterns.mostUsedActions = sortedActions.slice(0, 5);
    patterns.leastUsedActions = sortedActions.slice(-5).reverse();

    // Calculate action distribution percentages
    const totalActions = Object.values(actionsByType).reduce((a, b) => a + b, 0);
    if (totalActions > 0) {
      for (const [action, count] of Object.entries(actionsByType)) {
        patterns.actionDistribution[action] = {
          count,
          percentage: (count / totalActions) * 100
        };
      }
    }

    // Analyze test complexity
    for (const test of actionsByTest) {
      const commandCount = test.actionableCommands || 0;
      if (commandCount <= 5) {
        patterns.testComplexity.simple++;
      } else if (commandCount <= 15) {
        patterns.testComplexity.medium++;
      } else {
        patterns.testComplexity.complex++;
      }
    }

    return patterns;
  }

  /**
   * Compare LLM data with baseline
   */
  compareWithBaseline(actionAnalysis, llmKey) {
    if (!this.baselineData || llmKey === 'original') {
      return null; // No comparison for baseline itself
    }

    const baselineAnalysis = this.analyzeActionUsage(
      this.baselineData.executedResults,
      this.baselineData.efficiencyMetrics,
      'original'
    );

    const comparison = {
      target: llmKey,
      targetDisplayName: LLM_MAPPING[llmKey] || llmKey,
      baseline: 'original',
      baselineDisplayName: LLM_MAPPING['original'],
      timestamp: new Date(),
      metrics: {
        actionEfficiency: {
          target: actionAnalysis.efficiency.commandsPerTest,
          baseline: baselineAnalysis.efficiency.commandsPerTest,
          difference: actionAnalysis.efficiency.commandsPerTest - baselineAnalysis.efficiency.commandsPerTest,
          percentageChange: baselineAnalysis.efficiency.commandsPerTest > 0 ? 
            ((actionAnalysis.efficiency.commandsPerTest - baselineAnalysis.efficiency.commandsPerTest) / baselineAnalysis.efficiency.commandsPerTest) * 100 : 0
        },
        executionEfficiency: {
          target: actionAnalysis.execution.passRate,
          baseline: baselineAnalysis.execution.passRate,
          difference: actionAnalysis.execution.passRate - baselineAnalysis.execution.passRate,
          percentageChange: baselineAnalysis.execution.passRate > 0 ?
            ((actionAnalysis.execution.passRate - baselineAnalysis.execution.passRate) / baselineAnalysis.execution.passRate) * 100 : 0
        },
        avgExecutionTime: {
          target: actionAnalysis.execution.avgDuration,
          baseline: baselineAnalysis.execution.avgDuration,
          difference: actionAnalysis.execution.avgDuration - baselineAnalysis.execution.avgDuration,
          percentageChange: baselineAnalysis.execution.avgDuration > 0 ?
            ((actionAnalysis.execution.avgDuration - baselineAnalysis.execution.avgDuration) / baselineAnalysis.execution.avgDuration) * 100 : 0
        }
      },
      actionTypeComparison: this.compareActionTypes(actionAnalysis.actions.byType, baselineAnalysis.actions.byType),
      summary: {
        isMoreEfficient: actionAnalysis.efficiency.commandsPerTest < baselineAnalysis.efficiency.commandsPerTest,
        hasHigherPassRate: actionAnalysis.execution.passRate > baselineAnalysis.execution.passRate,
        isFaster: actionAnalysis.execution.avgDuration < baselineAnalysis.execution.avgDuration
      }
    };

    return comparison;
  }

  /**
   * Compare action types between target and baseline
   */
  compareActionTypes(targetActions, baselineActions) {
    const comparison = {};
    const allActionTypes = new Set([...Object.keys(targetActions), ...Object.keys(baselineActions)]);

    for (const actionType of allActionTypes) {
      const targetCount = targetActions[actionType] || 0;
      const baselineCount = baselineActions[actionType] || 0;
      
      comparison[actionType] = {
        target: targetCount,
        baseline: baselineCount,
        difference: targetCount - baselineCount,
        percentageChange: baselineCount > 0 ? ((targetCount - baselineCount) / baselineCount) * 100 : (targetCount > 0 ? 100 : 0)
      };
    }

    return comparison;
  }
  /**
   * Store action analysis in database  */  async storeActionAnalysis(executedResults, efficiencyMetrics, llmKey) {
    const collection = this.db.collection(COLLECTIONS.MERGED_TEST_DATA);
    
    // Calculate command usage statistics for comparisons
    const commandUsageStats = this.calculateCommandUsageStats(efficiencyMetrics.testFiles);
    
    // Prepare data in the format expected by the API
    const document = {
      llm: llmKey,
      displayName: LLM_MAPPING[llmKey] || llmKey,
      timestamp: new Date(),
      
      // Raw execution results
      results: executedResults,
      
      // Efficiency metrics in the expected format
      summary: {
        efficiency: {
          totalTestCases: efficiencyMetrics.summary?.totalTestCases || 0,
          totalActionableCommands: efficiencyMetrics.summary?.totalActionableCommands || 0,
          averageCommandsPerTest: efficiencyMetrics.summary?.averageCommandsPerTest || 0
        },
        execution: {
          tests: executedResults?.results?.summary?.tests || 0,
          passed: executedResults?.results?.summary?.passed || 0,
          failed: executedResults?.results?.summary?.failed || 0,
          start: executedResults?.results?.summary?.start || 0,
          stop: executedResults?.results?.summary?.stop || 0
        }
      },
      testFiles: efficiencyMetrics.testFiles,
      tests: this.convertTestFilesToTestsArray(efficiencyMetrics.testFiles, executedResults),
      actionableCommandTypes: commandUsageStats.allCommands, // Array with all command occurrences
      uniqueActionableCommandTypes: efficiencyMetrics.actionableCommandTypes, // Array with unique types
      excludedCommands: efficiencyMetrics.excludedCommands,
      commandUsageStats, // Additional stats for better comparisons
      
      metadata: {
        dataType: 'merged_test_data',
        version: '1.0',
        processedAt: new Date()
      }
    };

    // Use updateOne with upsert to avoid _id conflicts
    await collection.updateOne(
      { llm: llmKey },
      { $set: document },
      { upsert: true }
    );

    console.log(`💾 Stored action analysis for ${LLM_MAPPING[llmKey] || llmKey}`);
  }

  /**
   * Store comparison analysis in database
   */
  async storeComparisonAnalysis(comparisonAnalysis, llmKey) {
    if (!comparisonAnalysis) return;

    const collection = this.db.collection(COLLECTIONS.ACTION_USAGE_COMPARISON);
    
    const document = {
      _id: `action_comparison_${llmKey}_vs_original_${Date.now()}`,
      ...comparisonAnalysis,
      metadata: {
        dataType: 'action_usage_comparison',
        version: '1.0',
        processedAt: new Date()
      }
    };

    await collection.replaceOne(
      { _id: document._id },
      document,
      { upsert: true }
    );

    // Also create/update a "latest" document for easy access
    await collection.replaceOne(
      { _id: `latest_comparison_${llmKey}_vs_original` },
      { ...document, _id: `latest_comparison_${llmKey}_vs_original` },
      { upsert: true }
    );

    console.log(`💾 Stored comparison analysis for ${LLM_MAPPING[llmKey] || llmKey} vs baseline`);
  }

  /**
   * Generate comprehensive analysis summary
   */
  async generateAnalysisSummary() {
    console.log('📊 Generating Action Usage Analysis Summary...');
    
    const analysisCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_ANALYSIS);
    const comparisonCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_COMPARISON);
    
    // Get all latest analyses
    const allAnalyses = await analysisCollection.find({
      _id: { $regex: /^latest_action_analysis_/ }
    }).toArray();

    // Get all latest comparisons
    const allComparisons = await comparisonCollection.find({
      _id: { $regex: /^latest_comparison_/ }
    }).toArray();

    const summary = {
      _id: `action_usage_summary_${Date.now()}`,
      timestamp: new Date(),
      totalLLMs: allAnalyses.length,
      baseline: 'original',
      summary: {
        mostEfficientLLM: null,
        leastEfficientLLM: null,
        highestPassRateLLM: null,
        fastestLLM: null,
        actionTypeDistribution: {},
        overallMetrics: {
          avgCommandsPerTest: 0,
          avgPassRate: 0,
          avgExecutionTime: 0
        }
      },
      llmAnalyses: allAnalyses.map(analysis => ({
        llm: analysis.llm,
        displayName: analysis.displayName,
        commandsPerTest: analysis.efficiency.commandsPerTest,
        passRate: analysis.execution.passRate,
        avgDuration: analysis.execution.avgDuration,
        totalActions: analysis.actions.total
      })),
      comparisons: allComparisons.map(comp => ({
        llm: comp.target,
        displayName: comp.targetDisplayName,
        isMoreEfficient: comp.summary.isMoreEfficient,
        hasHigherPassRate: comp.summary.hasHigherPassRate,
        isFaster: comp.summary.isFaster,
        efficiencyChange: comp.metrics.actionEfficiency.percentageChange,
        passRateChange: comp.metrics.executionEfficiency.percentageChange,
        timeChange: comp.metrics.avgExecutionTime.percentageChange
      })),
      metadata: {
        dataType: 'action_usage_summary',
        version: '1.0',
        generatedAt: new Date()
      }
    };

    // Calculate summary metrics
    this.calculateSummaryMetrics(summary, allAnalyses, allComparisons);

    // Store summary
    const summaryCollection = this.db.collection(COLLECTIONS.ACTION_USAGE_SUMMARY);
    await summaryCollection.replaceOne(
      { _id: summary._id },
      summary,
      { upsert: true }
    );

    // Also create/update a "latest" document
    await summaryCollection.replaceOne(
      { _id: 'latest_action_usage_summary' },
      { ...summary, _id: 'latest_action_usage_summary' },
      { upsert: true }
    );

    console.log('✅ Action Usage Analysis Summary generated and stored');
    return summary;
  }

  /**
   * Calculate summary metrics for all LLMs
   */
  calculateSummaryMetrics(summary, allAnalyses, allComparisons) {
    if (allAnalyses.length === 0) return;

    // Find best performing LLMs
    let mostEfficient = allAnalyses[0];
    let leastEfficient = allAnalyses[0];
    let highestPassRate = allAnalyses[0];
    let fastest = allAnalyses[0];

    let totalCommands = 0;
    let totalPassRate = 0;
    let totalExecutionTime = 0;
    const actionTypeDistribution = {};

    for (const analysis of allAnalyses) {
      // Track efficiency (lower commands per test is better)
      if (analysis.efficiency.commandsPerTest < mostEfficient.efficiency.commandsPerTest) {
        mostEfficient = analysis;
      }
      if (analysis.efficiency.commandsPerTest > leastEfficient.efficiency.commandsPerTest) {
        leastEfficient = analysis;
      }

      // Track pass rate (higher is better)
      if (analysis.execution.passRate > highestPassRate.execution.passRate) {
        highestPassRate = analysis;
      }

      // Track execution time (lower is better)
      if (analysis.execution.avgDuration < fastest.execution.avgDuration) {
        fastest = analysis;
      }

      // Accumulate for averages
      totalCommands += analysis.efficiency.commandsPerTest;
      totalPassRate += analysis.execution.passRate;
      totalExecutionTime += analysis.execution.avgDuration;

      // Accumulate action type distribution
      for (const [actionType, count] of Object.entries(analysis.actions.byType)) {
        actionTypeDistribution[actionType] = (actionTypeDistribution[actionType] || 0) + count;
      }
    }

    // Set best performers
    summary.summary.mostEfficientLLM = {
      llm: mostEfficient.llm,
      displayName: mostEfficient.displayName,
      commandsPerTest: mostEfficient.efficiency.commandsPerTest
    };

    summary.summary.leastEfficientLLM = {
      llm: leastEfficient.llm,
      displayName: leastEfficient.displayName,
      commandsPerTest: leastEfficient.efficiency.commandsPerTest
    };

    summary.summary.highestPassRateLLM = {
      llm: highestPassRate.llm,
      displayName: highestPassRate.displayName,
      passRate: highestPassRate.execution.passRate
    };

    summary.summary.fastestLLM = {
      llm: fastest.llm,
      displayName: fastest.displayName,
      avgDuration: fastest.execution.avgDuration
    };

    // Calculate overall averages
    summary.summary.overallMetrics = {
      avgCommandsPerTest: totalCommands / allAnalyses.length,
      avgPassRate: totalPassRate / allAnalyses.length,
      avgExecutionTime: totalExecutionTime / allAnalyses.length
    };

    summary.summary.actionTypeDistribution = actionTypeDistribution;
  }

  /**
   * Check current status of Action Usage Analysis data
   */
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

      console.log('\n📊 Action Usage Analysis Status:');
      Object.entries(status).forEach(([collection, info]) => {
        console.log(`📁 ${collection}: ${info.count} documents ${info.latestDate ? `(latest: ${new Date(info.latestDate).toISOString()})` : '(empty)'}`);
      });

      return status;
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      throw error;
    }  }

    /**
   * Convert testFiles structure to tests array format expected by API   */  convertTestFilesToTestsArray(testFiles, executedResults) {
    const tests = [];
    const executedTestsMap = {};
    
    // Create a map of executed tests for easy lookup
    if (executedResults?.results?.tests) {
      executedResults.results.tests.forEach(test => {
        const fileName = test.filePath.split('\\').pop(); // Extract just the filename
        const fullTestName = test.name;
        
        // Create multiple key variations to handle test name mismatches
        const keys = [
          `${fileName}_${fullTestName}`, // Full match
          // Extract the "should ..." part from full test names like "User Sign-up and Login should remember a user for 30 days after login"
          fullTestName.includes(' should ') ? `${fileName}_should ${fullTestName.split(' should ').slice(1).join(' should ')}` : null,
          // Also try without "should" prefix for cases where efficiency metrics don't have it
          fullTestName.startsWith('should ') ? `${fileName}_${fullTestName.substring(7)}` : null
        ].filter(Boolean);
        
        keys.forEach(key => {
          executedTestsMap[key] = test;
        });
      });
    }
    
    console.log(`📋 Created execution map with ${Object.keys(executedTestsMap).length} entries`);
    
    // Convert testFiles to tests array
    Object.keys(testFiles).forEach(fileName => {
      const fileData = testFiles[fileName];
      if (fileData.tests) {
        Object.keys(fileData.tests).forEach(testName => {
          const testData = fileData.tests[testName];
          
          // Try multiple lookup keys to find matching execution data
          const lookupKeys = [
            `${fileName}_${testName}`,
            // If testName doesn't start with "should", try adding it
            testName.startsWith('should ') ? `${fileName}_${testName}` : `${fileName}_should ${testName}`,
            // Try without "should" prefix if it exists
            testName.startsWith('should ') ? `${fileName}_${testName.substring(7)}` : null
          ].filter(Boolean);
          
          let executedTest = null;
          let foundKey = null;
          
          // First try exact matches
          for (const key of lookupKeys) {
            executedTest = executedTestsMap[key];
            if (executedTest) {
              foundKey = key;
              break;
            }
          }
          
          // If no exact match found, try fuzzy matching
          if (!executedTest) {
            const testNameWords = testName.toLowerCase().split(/\s+/).filter(word => word.length > 2);
            
            let bestMatch = null;
            let bestScore = 0;
            let bestKey = null;
            
            // Look through all execution map keys for this file
            Object.keys(executedTestsMap).forEach(key => {
              if (key.startsWith(fileName + '_')) {
                const execTestName = key.substring(fileName.length + 1).toLowerCase();
                
                // Count matching words
                const matchingWords = testNameWords.filter(word => execTestName.includes(word));
                const score = matchingWords.length;
                
                // Use this match if it's better and has reasonable overlap
                if (score > bestScore && (score >= 2 || score / testNameWords.length >= 0.6)) {
                  bestScore = score;
                  bestMatch = executedTestsMap[key];
                  bestKey = key;
                }
              }
            });
            
            if (bestMatch) {
              executedTest = bestMatch;
              foundKey = bestKey;
              console.log(`🔍 Fuzzy match: "${testName}" -> "${foundKey}" (${bestScore}/${testNameWords.length} words)`);
            }
          }
          
          if (foundKey) {
            console.log(`✅ Found execution data with key: ${foundKey}`);
          } else {
            console.log(`❌ No execution data found for test: ${testName} in file: ${fileName}`);
          }
          
          tests.push({
            name: testName,
            filePath: `cypress\\tests\\ui\\${fileName}`,
            filename: fileName, // Add filename for easier debugging
            efficiency: {
              actionableCommands: testData.actionableCommands,
              commands: testData.commands
            },          execution: executedTest ? {
            status: executedTest.status,
            duration: executedTest.duration,
            rawStatus: executedTest.rawStatus,
            type: executedTest.type,
            retries: executedTest.retries,
            flaky: executedTest.flaky,
            browser: executedTest.browser,
            message: executedTest.message || null,
            trace: executedTest.trace || null,
            attachments: executedTest.attachments || []
          } : {
            // Provide default execution data when no match is found
            status: 'not_executed',
            duration: 0,
            rawStatus: 'not_executed',
            type: 'e2e',
            retries: 0,
            flaky: false,
            browser: 'unknown',
            message: 'Test was not executed or could not be matched with execution results',
            trace: null,
            attachments: []          },
          matched: executedTest !== null // Track whether this test was successfully matched
        });
        });
      }
    });    
    const matchedTests = tests.filter(t => t.matched).length;
    const unmatchedTests = tests.filter(t => !t.matched).length;
    
    console.log(`✅ Converted ${tests.length} tests:`);
    console.log(`   📊 ${matchedTests} matched with execution data`);
    console.log(`   ❌ ${unmatchedTests} unmatched (will show as 'not_executed')`);
    
    return tests;
  }

  /**
   * Calculate command usage statistics for comparisons
   */
  calculateCommandUsageStats(testFiles) {
    const commandCounts = {};
    const allCommands = [];
    
    // Count all commands across all tests
    Object.keys(testFiles).forEach(fileName => {
      const fileData = testFiles[fileName];
      if (fileData.tests) {
        Object.keys(fileData.tests).forEach(testName => {
          const testData = fileData.tests[testName];
          if (testData.commands) {
            testData.commands.forEach(command => {
              allCommands.push(command);
              commandCounts[command] = (commandCounts[command] || 0) + 1;
            });
          }
        });
      }
    });
    
    return {
      allCommands, // Array with all command occurrences
      commandCounts, // Object with command counts
      totalCommands: allCommands.length,
      uniqueCommands: Object.keys(commandCounts).length
    };
  }
}

console.log('📋 ActionUsageAnalysisManager class defined...');

/**
 * Main execution logic
 */
async function main() {
  const args = process.argv.slice(2);
  const manager = new ActionUsageAnalysisManager();

  console.log('🚀 Starting Action Usage Analysis...');
  console.log(`📝 Command line arguments:`, args);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`📂 Script directory: ${__dirname}`);
  console.log(`📊 Data directory: ${DATA_DIR}`);
  console.log(`📄 Executed tests dir: ${EXECUTED_TESTS_DIR}`);
  console.log(`📈 Efficiency metrics dir: ${EFFICIENCY_METRICS_DIR}`);

  try {
    await manager.connect();

    if (args.includes('--setup')) {
      await manager.setupCollections();
    } else if (args.includes('--process-all')) {
      await manager.setupCollections();
      const results = await manager.processAllLLMData();
      console.log(`\n✅ Successfully processed ${results.length} LLMs for Action Usage Analysis`);
    } else if (args.includes('--analysis')) {
      const summary = await manager.generateAnalysisSummary();
      console.log('\n📊 Analysis Summary Generated:');
      console.log(`Total LLMs analyzed: ${summary.totalLLMs}`);
      console.log(`Most efficient: ${summary.summary.mostEfficientLLM?.displayName} (${summary.summary.mostEfficientLLM?.commandsPerTest.toFixed(2)} commands/test)`);
      console.log(`Highest pass rate: ${summary.summary.highestPassRateLLM?.displayName} (${summary.summary.highestPassRateLLM?.passRate.toFixed(2)}%)`);
      console.log(`Fastest execution: ${summary.summary.fastestLLM?.displayName} (${summary.summary.fastestLLM?.avgDuration.toFixed(2)}ms avg)`);
    } else if (args.includes('--check')) {
      console.log('🔍 Running check mode...');
      await manager.checkStatus();
    } else {
      console.log('📖 No valid arguments provided. Available options:');
      console.log('   --setup           Setup collections and indexes');
      console.log('   --process-all     Process all LLM data');
      console.log('   --analysis        Generate analysis reports');
      console.log('   --check           Check current data status');
      console.log('\n💡 Example usage:');
      console.log('   node scripts/action-usage-analysis.js --setup');
      console.log('   node scripts/action-usage-analysis.js --process-all');
    }
  } catch (error) {
    console.error('❌ Action Usage Analysis failed:', error.message);
    console.error('🔍 Full error stack:', error.stack);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

console.log('🏁 Script loaded, checking if called directly...');
console.log('🔍 import.meta.url:', import.meta.url);
console.log('🔍 process.argv[1]:', process.argv[1]);

// Run if called directly
// Convert Windows path to file URL for comparison
const scriptPath = fileURLToPath(import.meta.url);
const calledPath = process.argv[1];

console.log('🔍 scriptPath (converted):', scriptPath);
console.log('🔍 calledPath:', calledPath);

if (scriptPath === calledPath) {
  console.log('🎯 Running main function...');
  main().catch(error => {
    console.error('💥 Unhandled error in main:', error);
    process.exit(1);
  });
} else {
  console.log('📦 Script imported as module, not running main');
}

export { ActionUsageAnalysisManager, COLLECTIONS as ACTION_COLLECTIONS };
