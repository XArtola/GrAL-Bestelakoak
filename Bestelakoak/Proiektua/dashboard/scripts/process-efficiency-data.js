import fs from 'fs';
import path from 'path';

/**
 * Process efficiency data from test results and AST analysis files
 * @param {string} resultsFilePath - Path to results JSON file
 * @param {string} astFilePath - Path to AST analysis JSON file
 * @param {string} llmModel - Name of the LLM model
 * @param {number} generationTime - Total generation time in ms
 */
export function processEfficiencyData(resultsFilePath, astFilePath, llmModel, generationTime) {
  try {
    // Read files
    const resultsData = JSON.parse(fs.readFileSync(resultsFilePath, 'utf8'));
    const astData = JSON.parse(fs.readFileSync(astFilePath, 'utf8'));
    
    const metrics = [];
    const baselineGenerationTime = 30000; // 30 seconds baseline
    const baselineActionsPerTest = 5; // 5 actions per test baseline
    
    // Process each test
    resultsData.results.tests.forEach(test => {
      // Extract filename from test filePath - handle both Unix and Windows paths
      const fileName = path.basename(test.filePath.replace(/\\/g, '/'), '.ts');
      const fileData = astData.testFiles[fileName];
      
      if (!fileData) {
        console.warn(`No AST data found for file: ${fileName}`);
        return;
      }
      
      // Clean test name for better matching - remove common prefixes
      const testName = test.name;
      let matchedTest = null;
      let actionsUsed = 0;
      
      // Strategy 1: Direct matching by removing common prefixes
      const cleanedTestName = testName
        .replace(/^.*?(should |navigates to |renders |creates |displays |updates |accepts |rejects |likes |comments |toggles |closes |filters |does not |first |mine |friends |User [ABC] |notifications from user interactions |app layout and responsiveness |renders and paginates all transaction feeds |filters transaction feeds by date range |filters transaction feeds by amount range |Feed Item Visibility |searches for a user by attribute )/i, '')
        .toLowerCase()
        .trim();
      
      // Try exact match first
      for (const [astTestName, astTestData] of Object.entries(fileData.tests)) {
        if (astTestName.toLowerCase() === cleanedTestName) {
          matchedTest = astTestData;
          actionsUsed = astTestData.actionableCommands;
          console.log(`✓ Exact match: "${testName}" -> "${astTestName}"`);
          break;
        }
      }
      
      // Strategy 2: Partial matching
      if (!matchedTest) {
        for (const [astTestName, astTestData] of Object.entries(fileData.tests)) {
          const astTestLower = astTestName.toLowerCase();
          
          // Check if either contains the other
          if (cleanedTestName.includes(astTestLower) || astTestLower.includes(cleanedTestName)) {
            matchedTest = astTestData;
            actionsUsed = astTestData.actionableCommands;
            console.log(`✓ Partial match: "${testName}" -> "${astTestName}"`);
            break;
          }
          
          // Check for keyword matching
          const testWords = cleanedTestName.split(' ').filter(word => word.length > 3);
          const astWords = astTestLower.split(' ').filter(word => word.length > 3);
          const commonWords = testWords.filter(word => astWords.includes(word));
          
          if (commonWords.length >= Math.min(2, Math.max(testWords.length, astWords.length))) {
            matchedTest = astTestData;
            actionsUsed = astTestData.actionableCommands;
            console.log(`✓ Keyword match: "${testName}" -> "${astTestName}" (${commonWords.join(', ')})`);
            break;
          }
        }
      }
      
      // Strategy 3: Use file average if no match
      if (!matchedTest) {
        const totalActions = Object.values(fileData.tests).reduce((sum, test) => sum + test.actionableCommands, 0);
        actionsUsed = Math.round(totalActions / fileData.totalTests);
        console.warn(`⚠ No match found for "${testName}", using file average: ${actionsUsed} actions`);
      }
      
      // Calculate efficiencies
      const passed = test.status === 'passed';
      const testGenerationTime = generationTime / resultsData.results.tests.length;
      
      // Generation efficiency: (baseline / actual) * success_multiplier
      const generationEfficiency = passed ? 
        Math.min(1, baselineGenerationTime / Math.max(testGenerationTime, 1000)) : 0;
      
      // Execution efficiency: (baseline / actual) * success_multiplier  
      const executionEfficiency = passed ? 
        Math.min(1, baselineActionsPerTest / Math.max(1, actionsUsed)) : 0;
      
      metrics.push({
        testName: test.name,
        filePath: test.filePath,
        llmModel,
        generationTime: Math.round(testGenerationTime),
        executionTime: test.duration,
        passed,
        actionsUsed,
        generationEfficiency: Math.round(generationEfficiency * 1000) / 1000,
        executionEfficiency: Math.round(executionEfficiency * 1000) / 1000
      });
    });
    
    return metrics;
  } catch (error) {
    console.error('Error processing efficiency data:', error);
    throw error;
  }
}

/**
 * Upload efficiency data to the database via API
 */
export async function uploadEfficiencyData(metrics) {
  try {
    const response = await fetch('http://localhost:3010/api/efficiency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metrics }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Efficiency data uploaded successfully:', result);
    return result;
  } catch (error) {
    console.error('Error uploading efficiency data:', error);
    
    // If upload fails, save to local file as backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `efficiency-backup-${timestamp}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(metrics, null, 2));
    console.log(`Data saved to backup file: ${backupFile}`);
    
    throw error;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , resultsFile, astFile, llmModel, generationTime] = process.argv;
  
  if (!resultsFile || !astFile || !llmModel || !generationTime) {
    console.error('Usage: node process-efficiency-data.js <resultsFile> <astFile> <llmModel> <generationTime>');
    console.error('Example: node process-efficiency-data.js data/resultsOriginal.json data/test-efficiency-metrics_original_ast.json "cypress-original" 45000');
    process.exit(1);
  }
  
  try {
    console.log(`Processing efficiency data for ${llmModel}...`);
    console.log(`Results file: ${resultsFile}`);
    console.log(`AST file: ${astFile}`);
    console.log(`Generation time: ${generationTime}ms`);
    
    const metrics = processEfficiencyData(resultsFile, astFile, llmModel, parseInt(generationTime));
    
    console.log(`\nProcessed ${metrics.length} test efficiency metrics:`);
    console.log(`- Passed tests: ${metrics.filter(m => m.passed).length}`);
    console.log(`- Failed tests: ${metrics.filter(m => !m.passed).length}`);
    console.log(`- Average generation efficiency: ${(metrics.reduce((sum, m) => sum + m.generationEfficiency, 0) / metrics.length).toFixed(3)}`);
    console.log(`- Average execution efficiency: ${(metrics.reduce((sum, m) => sum + m.executionEfficiency, 0) / metrics.length).toFixed(3)}`);
    
    // Try to upload to API
    console.log('\nAttempting to upload to dashboard API...');
    await uploadEfficiencyData(metrics);
    
    console.log(`\n✅ Successfully processed efficiency metrics for ${llmModel}`);
  } catch (error) {
    console.error('❌ Failed to process efficiency data:', error.message);
    process.exit(1);
  }
}
