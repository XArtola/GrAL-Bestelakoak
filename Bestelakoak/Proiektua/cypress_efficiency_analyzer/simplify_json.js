const fs = require('fs');
const path = require('path');

/**
 * Transforms the test efficiency metrics JSON structure to a simplified format
 * @param {Object} data - The original JSON data
 * @returns {Object} - The simplified JSON structure
 */
function simplifyTestMetrics(data) {
    const simplifiedData = {
        testFiles: {},
        summary: data.summary // Keep the original summary
    };

    // Process each test file
    for (const [fileName, fileData] of Object.entries(data.testFiles)) {
        // Skip files with no tests
        if (fileData.totalTests === 0 || !fileData.tests || Object.keys(fileData.tests).length === 0) {
            continue;
        }

        // For files with tests, process each test
        for (const [testName, testData] of Object.entries(fileData.tests)) {
            // Count command occurrences
            const commandCounts = {};
            if (testData.commands && Array.isArray(testData.commands)) {
                testData.commands.forEach(command => {
                    commandCounts[command] = (commandCounts[command] || 0) + 1;
                });
            }

            // Create simplified structure
            simplifiedData.testFiles[fileName] = {
                test_name: testName,
                actionableCommands: testData.actionableCommands || 0,
                commands: commandCounts
            };
        }
    }

    return simplifiedData;
}

/**
 * Process a single JSON file
 * @param {string} inputFilePath - Path to the input JSON file
 * @param {string} outputFilePath - Path to save the simplified JSON file
 */
function processFile(inputFilePath, outputFilePath) {
    try {
        // Read the input file
        const rawData = fs.readFileSync(inputFilePath, 'utf8');
        const data = JSON.parse(rawData);

        // Transform the data
        const simplifiedData = simplifyTestMetrics(data);

        // Write the simplified data to output file
        fs.writeFileSync(outputFilePath, JSON.stringify(simplifiedData, null, 2));
        
        console.log(`✅ Successfully processed: ${path.basename(inputFilePath)}`);
        console.log(`   Output saved to: ${path.basename(outputFilePath)}`);
    } catch (error) {
        console.error(`❌ Error processing ${inputFilePath}:`, error.message);
    }
}

/**
 * Process all test-efficiency-metrics JSON files in the current directory
 */
function processAllFiles() {
    const currentDir = __dirname;
    const resultsDir = path.join(currentDir, 'results');
    
    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
        console.log('📁 Created "results" directory');
    }
    
    // Find all test-efficiency-metrics JSON files
    const files = fs.readdirSync(currentDir)
        .filter(file => file.startsWith('test-efficiency-metrics') && file.endsWith('.json'))
        .filter(file => !file.includes('simplified')); // Avoid processing already simplified files

    if (files.length === 0) {
        console.log('❌ No test-efficiency-metrics JSON files found in the current directory.');
        return;
    }

    console.log(`🔍 Found ${files.length} files to process:`);
    files.forEach(file => console.log(`   - ${file}`));
    console.log();

    // Process each file
    files.forEach(file => {
        const inputPath = path.join(currentDir, file);
        const outputFileName = 'simplified_' + file;
        const outputPath = path.join(resultsDir, outputFileName);
        
        processFile(inputPath, outputPath);
    });

    console.log('\n🎉 Processing complete!');
}

// Check if this script is being run directly
if (require.main === module) {
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // No arguments provided, process all files
        console.log('🚀 Processing all test-efficiency-metrics JSON files...\n');
        processAllFiles();
    } else if (args.length === 1 || args.length === 2) {
        // Single file processing
        const inputFile = args[0];
        const outputFile = args[1] || inputFile.replace('.json', '_simplified.json');
        
        console.log(`🚀 Processing single file: ${inputFile}\n`);
        processFile(inputFile, outputFile);
    } else {
        console.log('Usage:');
        console.log('  node simplify_json.js                    # Process all test-efficiency-metrics files');
        console.log('  node simplify_json.js <input_file>       # Process single file');
        console.log('  node simplify_json.js <input> <output>   # Process single file with custom output name');
    }
}

module.exports = { simplifyTestMetrics, processFile, processAllFiles };
