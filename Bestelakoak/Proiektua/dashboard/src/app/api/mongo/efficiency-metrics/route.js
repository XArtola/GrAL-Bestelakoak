import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

/**
 * MongoDB API Route for Efficiency Metrics
 * GET /api/mongo/efficiency-metrics
 * 
 * Calculates efficiency metrics from the summary collection data.
 * Query parameters:
 * - llm: Filter by specific LLM (optional)
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'llm_dashboard';

/**
 * Calculate efficiency metrics from test execution data
 */
function calculateEfficiencyMetrics(summaryData) {
  const metrics = [];
  
  summaryData.forEach(dataset => {
    const { LLM, tests, totalTests, passedTests, failedTests } = dataset;
    
    // Calculate execution time statistics
    const executionTimes = tests
      .filter(test => test.executionTime && test.executionTime > 0)
      .map(test => test.executionTime);
    
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;
    
    const minExecutionTime = executionTimes.length > 0 ? Math.min(...executionTimes) : 0;
    const maxExecutionTime = executionTimes.length > 0 ? Math.max(...executionTimes) : 0;
    
    // Calculate success rate
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    // Calculate efficiency score (higher is better)
    // Formula: (Success Rate / Average Execution Time) * 100
    const efficiencyScore = avgExecutionTime > 0 ? (successRate / avgExecutionTime) * 100 : 0;
    
    // Calculate throughput (tests per second)
    const totalExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0);
    const throughput = totalExecutionTime > 0 ? (tests.length / (totalExecutionTime / 1000)) : 0;
    
    metrics.push({
      llm: LLM,
      id: LLM?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown',
      totalTests,
      passedTests,
      failedTests,
      successRate: Math.round(successRate * 100) / 100,
      avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
      minExecutionTime: Math.round(minExecutionTime * 100) / 100,
      maxExecutionTime: Math.round(maxExecutionTime * 100) / 100,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      timestamp: new Date().toISOString()
    });
  });
  
  return metrics;
}

export async function GET(request) {
  let client;
  
  try {
    const { searchParams } = new URL(request.url);
    const llm = searchParams.get('llm');
    
    console.log('📊 Calculating efficiency metrics from MongoDB summary data...');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection('summary');
    
    let query = {};
    
    if (llm) {
      query.LLM = llm;
    }
    
    console.log('🔍 Querying summary collection with:', query);
    
    const summaryData = await collection.find(query).toArray();
    
    console.log(`📋 Found ${summaryData.length} summary records`);
    
    if (summaryData.length === 0) {
      console.log('⚠️ No summary data found in MongoDB');
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString(),
        source: 'mongodb',
        message: 'No summary data available for efficiency calculation'
      });
    }
    
    // Calculate efficiency metrics from summary data
    const efficiencyMetrics = calculateEfficiencyMetrics(summaryData);
    
    console.log('📊 Calculated efficiency metrics for LLMs:', efficiencyMetrics.map(m => m.llm));
    
    const response = {
      success: true,
      data: efficiencyMetrics,
      count: efficiencyMetrics.length,
      timestamp: new Date().toISOString(),
      source: 'mongodb',
      query: { llm }
    };
    
    console.log(`✅ Generated ${efficiencyMetrics.length} efficiency metric datasets`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error calculating efficiency metrics:', error.message);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      data: [],
      count: 0,
      timestamp: new Date().toISOString(),
      source: 'mongodb'
    }, { status: 500 });
    
  } finally {
    if (client) {
      await client.close();
    }
  }
}
