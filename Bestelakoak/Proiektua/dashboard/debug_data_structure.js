import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugDataStructure() {
  console.log('🔍 Debugging data structure...');
  
  // Check execution results structure
  const executedResultsPath = path.join(__dirname, 'data', 'test_execution_results', 'executed_tests_results', 'results_claude_3_7_sonnet_thinking.json');
  const efficiencyMetricsPath = path.join(__dirname, 'data', 'test_execution_results', 'test_eficcency_metrics', 'test-efficiency-metrics_claude_3_7_sonnet_thinking.json');
  
  console.log('📄 Reading execution results...');
  const executedResults = JSON.parse(fs.readFileSync(executedResultsPath, 'utf8'));
  console.log('📄 Reading efficiency metrics...');
  const efficiencyMetrics = JSON.parse(fs.readFileSync(efficiencyMetricsPath, 'utf8'));
  
  console.log('\n🔍 Execution Results Structure:');
  console.log('Total tests in results:', executedResults.results.tests.length);
  console.log('First 3 test names from execution results:');
  executedResults.results.tests.slice(0, 3).forEach((test, i) => {
    console.log(`${i + 1}. "${test.name}" (${test.filePath})`);
  });
  
  console.log('\n🔍 Efficiency Metrics Structure:');
  const fileNames = Object.keys(efficiencyMetrics.testFiles);
  console.log('Total test files:', fileNames.length);
  console.log('First 3 test files and their tests:');
  fileNames.slice(0, 3).forEach((fileName, i) => {
    const fileData = efficiencyMetrics.testFiles[fileName];
    console.log(`${i + 1}. File: ${fileName} (${fileData.totalTests} tests)`);
    const testNames = Object.keys(fileData.tests || {});
    testNames.forEach(testName => {
      console.log(`   - "${testName}"`);
    });
  });
  
  // Check MongoDB data
  console.log('\n🔍 Checking MongoDB data...');
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('tests');
  const collection = db.collection('merged_test_data');
  
  const claudeData = await collection.findOne({ llm: 'claude_3_7_sonnet_thinking' });
  if (claudeData && claudeData.tests) {
    console.log('MongoDB tests count:', claudeData.tests.length);
    console.log('First 3 tests in MongoDB:');
    claudeData.tests.slice(0, 3).forEach((test, i) => {
      console.log(`${i + 1}. "${test.name}" (file: ${test.filePath || 'undefined'})`);
      console.log(`   - execution: ${test.execution ? 'found' : 'null'}`);
      console.log(`   - efficiency: ${test.efficiency ? 'found' : 'null'}`);
    });
  }
  
  await client.close();
}

debugDataStructure().catch(console.error);
