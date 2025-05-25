#!/usr/bin/env node

/**
 * LLM Efficiency Analyzer for Cypress Test Generation
 * 
 * This tool measures the efficiency of different LLMs in generating Cypress tests
 * by combining performance metrics (generation time, execution time) and quality 
 * metrics (code coverage, pass/fail ratios, code quality analysis).
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Data paths
  MATCHED_DATA_DIR: '../matched_data',
  CTRF_RESULTS_DIR: '../cypress-realworld-app/ctrf',
  GENERATED_TESTS_DIR: '../ui/complete_tests',
  OUTPUT_DIR: '../efficiency_reports',
  
  // LLM mapping for file names
  LLM_MAPPING: {
    'Claude 3.7 Sonnet': 'claude_3_7_sonnet',
    'Claude 3.5 Sonnet': 'claude_3_5_sonnet',
    'Claude Sonnet 4': 'claude_sonnet_4',
    'GPT-4o': 'GPT_4o',
    'GPT-4o Mini': 'o4_mini_preview',
    'Gemini 2.5 Pro': 'gemini_2_5_pro_preview'
  },
  
  // Efficiency calculation weights (must sum to 1.0)
  WEIGHTS: {
    codeQuality: 0.4,      // Quality of generated code
    generationSpeed: 0.2,   // Speed of code generation
    executionSuccess: 0.3,  // Test execution success rate
    codeReuse: 0.1         // Code reusability and patterns
  },
  
  // Quality scoring thresholds
  QUALITY_THRESHOLDS: {
    PERFECT: 1.0,          // Test passes without modification
    GOOD: 0.8,             // Minor fixes needed
    FAIR: 0.5,             // Significant fixes but usable logic
    POOR: 0.2,             // Major rewrite needed
    UNUSABLE: 0.0          // Completely unusable
  }
};

class EfficiencyAnalyzer {
  constructor() {
    this.llmData = new Map();
    this.aggregatedResults = {};
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
      console.log(`Created output directory: ${CONFIG.OUTPUT_DIR}`);
    }
  }

  /**
   * Load generation time data from matched_data files
   */
  loadGenerationTimes() {
    console.log('\n=== Loading Generation Time Data ===');
    
    for (const [llmDisplayName, llmFileId] of Object.entries(CONFIG.LLM_MAPPING)) {
      const filePath = path.join(CONFIG.MATCHED_DATA_DIR, `matched_data_${llmFileId}.json`);
      
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (!this.llmData.has(llmDisplayName)) {
            this.llmData.set(llmDisplayName, {
              generationTimes: [],
              testResults: [],
              generatedCode: [],
              totalGenerationTime: 0,
              avgGenerationTime: 0,
              testCount: 0
            });
          }
          
          const llmInfo = this.llmData.get(llmDisplayName);
          llmInfo.generationTimes = data;
          llmInfo.totalGenerationTime = data.reduce((sum, entry) => sum + (entry.durationMs || 0), 0);
          llmInfo.avgGenerationTime = llmInfo.totalGenerationTime / data.length;
          llmInfo.testCount = data.length;
          
          console.log(`✓ ${llmDisplayName}: ${data.length} entries, avg generation time: ${llmInfo.avgGenerationTime.toFixed(2)}ms`);
        } catch (error) {
          console.error(`✗ Error loading ${filePath}:`, error.message);
        }
      } else {
        console.log(`⚠ File not found: ${filePath}`);
      }
    }
  }

  /**
   * Load test execution results from CTRF files
   */
  loadTestResults() {
    console.log('\n=== Loading Test Execution Results ===');
    
    const ctrfFiles = fs.readdirSync(CONFIG.CTRF_RESULTS_DIR)
      .filter(file => file.startsWith('results') && file.endsWith('.json'));
    
    for (const file of ctrfFiles) {
      const filePath = path.join(CONFIG.CTRF_RESULTS_DIR, file);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const llmName = this.extractLLMNameFromFile(file);
        
        if (llmName && this.llmData.has(llmName)) {
          const llmInfo = this.llmData.get(llmName);
          llmInfo.testResults = data.results;
          
          console.log(`✓ ${llmName}: ${data.results.summary.tests} tests, ${data.results.summary.passed} passed, ${data.results.summary.failed} failed`);
        }
      } catch (error) {
        console.error(`✗ Error loading ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Extract LLM name from CTRF filename
   */
  extractLLMNameFromFile(filename) {
    const mapping = {
      'resultsClaude3_7': 'Claude 3.7 Sonnet',
      'resultsClaude3_5': 'Claude 3.5 Sonnet',
      'resultsClaude_sonnet_4': 'Claude Sonnet 4',
      'resultsGPT_4o': 'GPT-4o',
      'resultso4_mini': 'GPT-4o Mini',
      'resultsGemini2_5Pro': 'Gemini 2.5 Pro'
    };
    
    for (const [filePrefix, llmName] of Object.entries(mapping)) {
      if (filename.includes(filePrefix)) {
        return llmName;
      }
    }
    return null;
  }

  /**
   * Analyze code quality of generated tests
   */
  analyzeCodeQuality() {
    console.log('\n=== Analyzing Code Quality ===');
    
    for (const [llmName, llmInfo] of this.llmData.entries()) {
      if (!llmInfo.generationTimes) continue;
      
      let totalQuality = 0;
      let emptyCodeCount = 0;
      let validCodeCount = 0;
      
      for (const entry of llmInfo.generationTimes) {
        const code = entry.code || '';
        const quality = this.calculateCodeQuality(code, entry);
        
        if (code.trim() === '') {
          emptyCodeCount++;
        } else {
          validCodeCount++;
          totalQuality += quality;
        }
      }
      
      llmInfo.codeQualityMetrics = {
        avgQuality: validCodeCount > 0 ? totalQuality / validCodeCount : 0,
        emptyCodeRatio: emptyCodeCount / llmInfo.generationTimes.length,
        validCodeRatio: validCodeCount / llmInfo.generationTimes.length,
        totalEntries: llmInfo.generationTimes.length,
        emptyCount: emptyCodeCount,
        validCount: validCodeCount
      };
      
      console.log(`✓ ${llmName}: Quality ${llmInfo.codeQualityMetrics.avgQuality.toFixed(3)}, Empty: ${emptyCodeCount}/${llmInfo.generationTimes.length}`);
    }
  }

  /**
   * Calculate code quality score for a single code snippet
   */
  calculateCodeQuality(code, entry) {
    if (!code || code.trim() === '') {
      return CONFIG.QUALITY_THRESHOLDS.UNUSABLE;
    }
    
    let score = 0.5; // Base score for non-empty code
    
    // Check for Cypress-specific patterns
    const cypressPatterns = [
      /cy\./g,           // Cypress commands
      /should\(/g,       // Assertions
      /visit\(/g,        // Page visits
      /click\(/g,        // Interactions
      /type\(/g,         // Text input
      /getBySel\(/g,     // Custom selector
      /\.spec\./g        // Test file pattern
    ];
    
    const patternMatches = cypressPatterns.reduce((count, pattern) => {
      const matches = code.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    // More patterns = higher quality
    if (patternMatches >= 5) score = 0.9;
    else if (patternMatches >= 3) score = 0.7;
    else if (patternMatches >= 1) score = 0.6;
    
    // Bonus for complete test structure
    if (code.includes('it(') && code.includes('cy.') && code.includes('should')) {
      score += 0.1;
    }
    
    // Penalty for very short code
    if (code.length < 50) {
      score *= 0.7;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Calculate execution success metrics
   */
  calculateExecutionMetrics() {
    console.log('\n=== Calculating Execution Metrics ===');
    
    for (const [llmName, llmInfo] of this.llmData.entries()) {
      if (!llmInfo.testResults?.summary) continue;
      
      const summary = llmInfo.testResults.summary;
      const executionMetrics = {
        totalTests: summary.tests,
        passedTests: summary.passed,
        failedTests: summary.failed,
        skippedTests: summary.skipped,
        passRate: summary.tests > 0 ? summary.passed / summary.tests : 0,
        failRate: summary.tests > 0 ? summary.failed / summary.tests : 0,
        executionTime: summary.stop - summary.start,
        avgExecutionTime: summary.tests > 0 ? (summary.stop - summary.start) / summary.tests : 0
      };
      
      llmInfo.executionMetrics = executionMetrics;
      
      console.log(`✓ ${llmName}: Pass rate ${(executionMetrics.passRate * 100).toFixed(1)}%, Avg execution: ${executionMetrics.avgExecutionTime.toFixed(2)}ms`);
    }
  }

  /**
   * Calculate overall efficiency score
   */
  calculateEfficiencyScores() {
    console.log('\n=== Calculating Efficiency Scores ===');
    
    // Get normalized values for comparison
    const generationTimes = Array.from(this.llmData.values()).map(info => info.avgGenerationTime).filter(t => t > 0);
    const maxGenerationTime = Math.max(...generationTimes);
    const minGenerationTime = Math.min(...generationTimes);
    
    for (const [llmName, llmInfo] of this.llmData.entries()) {
      const metrics = this.calculateLLMEfficiency(llmInfo, maxGenerationTime, minGenerationTime);
      llmInfo.efficiencyMetrics = metrics;
      
      console.log(`✓ ${llmName}: Overall efficiency ${metrics.overallScore.toFixed(3)}`);
    }
  }

  /**
   * Calculate efficiency metrics for a single LLM
   */
  calculateLLMEfficiency(llmInfo, maxGenTime, minGenTime) {
    // Generation speed score (inverted - lower time is better)
    const generationSpeedScore = maxGenTime > minGenTime ? 
      1 - ((llmInfo.avgGenerationTime - minGenTime) / (maxGenTime - minGenTime)) : 0.5;
    
    // Code quality score
    const codeQualityScore = llmInfo.codeQualityMetrics?.avgQuality || 0;
    
    // Execution success score
    const executionSuccessScore = llmInfo.executionMetrics?.passRate || 0;
    
    // Code reuse score (based on valid code ratio)
    const codeReuseScore = llmInfo.codeQualityMetrics?.validCodeRatio || 0;
    
    // Weighted overall score
    const overallScore = 
      (CONFIG.WEIGHTS.codeQuality * codeQualityScore) +
      (CONFIG.WEIGHTS.generationSpeed * generationSpeedScore) +
      (CONFIG.WEIGHTS.executionSuccess * executionSuccessScore) +
      (CONFIG.WEIGHTS.codeReuse * codeReuseScore);
    
    return {
      codeQualityScore,
      generationSpeedScore,
      executionSuccessScore,
      codeReuseScore,
      overallScore,
      ranking: 0 // Will be calculated later
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n=== Generating Efficiency Report ===');
    
    // Sort LLMs by overall efficiency
    const rankedLLMs = Array.from(this.llmData.entries())
      .filter(([_, info]) => info.efficiencyMetrics)
      .sort(([_, a], [__, b]) => b.efficiencyMetrics.overallScore - a.efficiencyMetrics.overallScore)
      .map(([name, info], index) => {
        info.efficiencyMetrics.ranking = index + 1;
        return [name, info];
      });
    
    // Generate detailed report
    const report = this.createDetailedReport(rankedLLMs);
    
    // Save reports
    this.saveReports(report, rankedLLMs);
    
    // Display summary
    this.displaySummary(rankedLLMs);
  }

  /**
   * Create detailed efficiency report
   */
  createDetailedReport(rankedLLMs) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        analyzer: 'LLM Efficiency Analyzer v1.0',
        totalLLMs: rankedLLMs.length,
        weights: CONFIG.WEIGHTS
      },
      summary: {
        topPerformer: rankedLLMs[0]?.[0] || 'N/A',
        avgEfficiencyScore: rankedLLMs.reduce((sum, [_, info]) => sum + info.efficiencyMetrics.overallScore, 0) / rankedLLMs.length,
        totalTestsAnalyzed: rankedLLMs.reduce((sum, [_, info]) => sum + (info.testCount || 0), 0)
      },
      rankings: rankedLLMs.map(([name, info]) => ({
        rank: info.efficiencyMetrics.ranking,
        llm: name,
        overallScore: info.efficiencyMetrics.overallScore,
        codeQuality: info.efficiencyMetrics.codeQualityScore,
        generationSpeed: info.efficiencyMetrics.generationSpeedScore,
        executionSuccess: info.efficiencyMetrics.executionSuccessScore,
        codeReuse: info.efficiencyMetrics.codeReuseScore,
        avgGenerationTime: info.avgGenerationTime,
        testCount: info.testCount,
        passRate: info.executionMetrics?.passRate || 0,
        emptyCodeRatio: info.codeQualityMetrics?.emptyCodeRatio || 0
      })),
      detailedMetrics: Object.fromEntries(
        rankedLLMs.map(([name, info]) => [name, {
          generationMetrics: {
            totalTime: info.totalGenerationTime,
            avgTime: info.avgGenerationTime,
            testCount: info.testCount,
            timePerTest: info.avgGenerationTime
          },
          qualityMetrics: info.codeQualityMetrics,
          executionMetrics: info.executionMetrics,
          efficiencyScores: info.efficiencyMetrics
        }])
      )
    };
  }

  /**
   * Save reports to files
   */
  saveReports(report, rankedLLMs) {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Save JSON report
    const jsonPath = path.join(CONFIG.OUTPUT_DIR, `efficiency_report_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Save CSV summary
    const csvPath = path.join(CONFIG.OUTPUT_DIR, `efficiency_summary_${timestamp}.csv`);
    this.saveCsvReport(rankedLLMs, csvPath);
    
    // Save human-readable report
    const txtPath = path.join(CONFIG.OUTPUT_DIR, `efficiency_report_${timestamp}.txt`);
    this.saveTextReport(report, txtPath);
    
    console.log(`\n📊 Reports saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   CSV:  ${csvPath}`);
    console.log(`   TXT:  ${txtPath}`);
  }

  /**
   * Save CSV summary report
   */
  saveCsvReport(rankedLLMs, filePath) {
    const headers = [
      'Rank', 'LLM', 'Overall Score', 'Code Quality', 'Generation Speed', 
      'Execution Success', 'Code Reuse', 'Avg Generation Time (ms)', 
      'Test Count', 'Pass Rate', 'Empty Code Ratio'
    ];
    
    const rows = rankedLLMs.map(([name, info]) => [
      info.efficiencyMetrics.ranking,
      name,
      info.efficiencyMetrics.overallScore.toFixed(4),
      info.efficiencyMetrics.codeQualityScore.toFixed(4),
      info.efficiencyMetrics.generationSpeedScore.toFixed(4),
      info.efficiencyMetrics.executionSuccessScore.toFixed(4),
      info.efficiencyMetrics.codeReuseScore.toFixed(4),
      info.avgGenerationTime.toFixed(2),
      info.testCount,
      (info.executionMetrics?.passRate || 0).toFixed(4),
      (info.codeQualityMetrics?.emptyCodeRatio || 0).toFixed(4)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    fs.writeFileSync(filePath, csvContent);
  }

  /**
   * Save human-readable text report
   */
  saveTextReport(report, filePath) {
    const content = `
LLM EFFICIENCY ANALYSIS REPORT
Generated: ${report.metadata.generatedAt}
==============================

SUMMARY
-------
Total LLMs Analyzed: ${report.metadata.totalLLMs}
Top Performer: ${report.summary.topPerformer}
Average Efficiency Score: ${report.summary.avgEfficiencyScore.toFixed(4)}
Total Tests Analyzed: ${report.summary.totalTestsAnalyzed}

SCORING WEIGHTS
---------------
Code Quality: ${(CONFIG.WEIGHTS.codeQuality * 100).toFixed(1)}%
Generation Speed: ${(CONFIG.WEIGHTS.generationSpeed * 100).toFixed(1)}%
Execution Success: ${(CONFIG.WEIGHTS.executionSuccess * 100).toFixed(1)}%
Code Reuse: ${(CONFIG.WEIGHTS.codeReuse * 100).toFixed(1)}%

RANKINGS
--------
${report.rankings.map(llm => 
  `${llm.rank}. ${llm.llm}
     Overall Score: ${llm.overallScore.toFixed(4)}
     Code Quality: ${llm.codeQuality.toFixed(4)}
     Generation Speed: ${llm.generationSpeed.toFixed(4)}
     Execution Success: ${llm.executionSuccess.toFixed(4)}
     Code Reuse: ${llm.codeReuse.toFixed(4)}
     Avg Generation Time: ${llm.avgGenerationTime.toFixed(2)}ms
     Test Count: ${llm.testCount}
     Pass Rate: ${(llm.passRate * 100).toFixed(1)}%
     Empty Code Ratio: ${(llm.emptyCodeRatio * 100).toFixed(1)}%
`).join('\n')}

ANALYSIS INSIGHTS
-----------------
${this.generateInsights(report)}
`;
    
    fs.writeFileSync(filePath, content.trim());
  }

  /**
   * Generate insights from the analysis
   */
  generateInsights(report) {
    const rankings = report.rankings;
    if (rankings.length === 0) return 'No data available for analysis.';
    
    const insights = [];
    
    // Speed vs Quality analysis
    const fastestLLM = rankings.reduce((prev, curr) => 
      prev.generationSpeed > curr.generationSpeed ? prev : curr);
    const highestQuality = rankings.reduce((prev, curr) => 
      prev.codeQuality > curr.codeQuality ? prev : curr);
    
    insights.push(`• Fastest generation: ${fastestLLM.llm} (${fastestLLM.avgGenerationTime.toFixed(0)}ms avg)`);
    insights.push(`• Highest code quality: ${highestQuality.llm} (${(highestQuality.codeQuality * 100).toFixed(1)}% quality score)`);
    
    // Empty code analysis
    const emptyCodeStats = rankings.map(llm => ({
      name: llm.llm,
      emptyRatio: llm.emptyCodeRatio
    })).sort((a, b) => a.emptyRatio - b.emptyRatio);
    
    insights.push(`• Lowest empty code ratio: ${emptyCodeStats[0].name} (${(emptyCodeStats[0].emptyRatio * 100).toFixed(1)}%)`);
    insights.push(`• Highest empty code ratio: ${emptyCodeStats[emptyCodeStats.length - 1].name} (${(emptyCodeStats[emptyCodeStats.length - 1].emptyRatio * 100).toFixed(1)}%)`);
    
    // Pass rate analysis
    const bestPassRate = rankings.reduce((prev, curr) => 
      prev.passRate > curr.passRate ? prev : curr);
    
    insights.push(`• Best test pass rate: ${bestPassRate.llm} (${(bestPassRate.passRate * 100).toFixed(1)}%)`);
    
    return insights.join('\n');
  }

  /**
   * Display summary in console
   */
  displaySummary(rankedLLMs) {
    console.log('\n' + '='.repeat(60));
    console.log('          🏆 LLM EFFICIENCY RANKINGS 🏆');
    console.log('='.repeat(60));
    
    rankedLLMs.forEach(([name, info], index) => {
      const metrics = info.efficiencyMetrics;
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      
      console.log(`\n${emoji} ${index + 1}. ${name}`);
      console.log(`   Overall Score: ${metrics.overallScore.toFixed(4)}`);
      console.log(`   Quality: ${metrics.codeQualityScore.toFixed(3)} | Speed: ${metrics.generationSpeedScore.toFixed(3)} | Success: ${metrics.executionSuccessScore.toFixed(3)}`);
      console.log(`   Avg Generation: ${info.avgGenerationTime.toFixed(0)}ms | Tests: ${info.testCount} | Pass Rate: ${((info.executionMetrics?.passRate || 0) * 100).toFixed(1)}%`);
    });
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Run the complete analysis
   */
  async run() {
    console.log('🚀 Starting LLM Efficiency Analysis...\n');
    
    try {
      this.loadGenerationTimes();
      this.loadTestResults();
      this.analyzeCodeQuality();
      this.calculateExecutionMetrics();
      this.calculateEfficiencyScores();
      this.generateReport();
      
      console.log('\n✅ Analysis completed successfully!');
    } catch (error) {
      console.error('\n❌ Analysis failed:', error);
      throw error;
    }
  }
}

// Run the analyzer if called directly
if (require.main === module) {
  const analyzer = new EfficiencyAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = EfficiencyAnalyzer;
