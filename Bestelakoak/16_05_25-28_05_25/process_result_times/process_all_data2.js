// process_all_data.js
const fs = require('fs-extra'); // Using fs-extra instead of fs for additional functionality
const path = require('path');
const readline = require('readline');
const moment = require('moment');
const ts = require('typescript'); // Add TypeScript for AST parsing

// Base directory paths
const BASE_DIR = 'c:\\Users\\xabia\\OneDrive\\Documentos\\4.Maila\\TFG-Bestelakoak\\Bestelakoak\\26_05_25-28_05_25';
const PYWINAUTO_DIR = path.join(BASE_DIR, 'pywinauto');
const MATCHED_DATA_DIR = path.join(BASE_DIR, 'matched_data');

// Ensure the matched_data directory exists
if (!fs.existsSync(MATCHED_DATA_DIR)) {
    console.log(`Creating directory: ${MATCHED_DATA_DIR}`);
    fs.mkdirSync(MATCHED_DATA_DIR, { recursive: true });
}

// ------------------------------------------------------------------------
// PART 1: Match timestamps between files
// ------------------------------------------------------------------------

// Function to parse ISO datetime and make it comparable
function parseTimestamp(timestamp) {
    return moment(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS');
}

// Function to find the closest timestamp match
function findClosestTimestamp(target, timestamps, maxDiffSeconds = 5) {
    const targetMoment = parseTimestamp(target);
    let closestMatch = null;
    let minDiff = Infinity;

    for (const timestamp of timestamps) {
        const currentMoment = parseTimestamp(timestamp);
        const diffMs = Math.abs(currentMoment.diff(targetMoment));
        const diffSeconds = diffMs / 1000;
        
        if (diffSeconds <= maxDiffSeconds && diffSeconds < minDiff) {
            minDiff = diffSeconds;
            closestMatch = timestamp;
        }
    }

    return closestMatch;
}

// Function to process each output folder
async function processOutputFolder(folderPath) {
    console.log(`Processing folder: ${folderPath}`);
    
    const folderName = path.basename(folderPath);
    const modelName = folderName.replace('output_', '');
    
    // Find relevant files in the folder
    const files = fs.readdirSync(folderPath);
    
    // Find timestamp file
    const timestampFiles = files.filter(file => file.startsWith('timestamps_') && file.endsWith('.json'));
    if (timestampFiles.length === 0) {
        console.error(`No timestamp file found in folder: ${folderPath}`);
        return;
    }
    
    // Find copilot timings file
    const copilotTimingFiles = files.filter(file => file.startsWith('copilot_timings_') && file.endsWith('.json'));
    if (copilotTimingFiles.length === 0) {
        console.error(`No copilot timings file found in folder: ${folderPath}`);
        return;
    }
    
    const timestampFilePath = path.join(folderPath, timestampFiles[0]);
    const copilotTimingFilePath = path.join(folderPath, copilotTimingFiles[0]);
    
    console.log(`Found files:
    - Timestamp file: ${timestampFiles[0]}
    - Copilot timing file: ${copilotTimingFiles[0]}`);
    
    // Read the files
    try {
        // Read and parse the timestamp file
        const timestampContent = fs.readFileSync(timestampFilePath, 'utf8');
        const cleanTimestampContent = timestampContent.replace(/^\/\/.*\n/, '').trim();
        const timestampData = JSON.parse(cleanTimestampContent);
        console.log(`Timestamp data loaded with ${timestampData.length} entries`);
        
        // Read and parse the copilot timings file
        const copilotTimingContent = fs.readFileSync(copilotTimingFilePath, 'utf8');
        const cleanCopilotTimingContent = copilotTimingContent.replace(/^\/\/.*\n/, '').trim();
        const copilotTimingData = JSON.parse(cleanCopilotTimingContent);
        console.log(`Copilot timing data loaded with ${copilotTimingData.length} entries`);
        
        // Create a map of timestamp values to copilot timing objects
        const copilotTimingMap = new Map();
        const copilotTimestamps = [];
        
        copilotTimingData.forEach(timing => {
            if (timing.requestTimestamp) {
                copilotTimingMap.set(timing.requestTimestamp, timing);
                copilotTimestamps.push(timing.requestTimestamp);
            }
        });
        
        // Match timestamp entries with copilot timing entries
        const matchedData = [];
        const processedTimestamps = new Set();
        
        for (const timestamp of timestampData) {
            if (!timestamp.timestamp) continue;
            
            const closestTimestamp = findClosestTimestamp(timestamp.timestamp, copilotTimestamps);
            
            if (closestTimestamp && !processedTimestamps.has(closestTimestamp)) {
                const copilotTiming = copilotTimingMap.get(closestTimestamp);
                
                if (copilotTiming) {
                    // Mark this timestamp as processed
                    processedTimestamps.add(closestTimestamp);
                    
                    // Create a matched entry
                    matchedData.push({
                        ...timestamp,
                        ...copilotTiming,
                        code: "" // Will be filled in later
                    });
                }
            }
        }
        
        // Write the matched data to a new file in the matched_data directory
        const outputFilePath = path.join(MATCHED_DATA_DIR, `matched_data_${modelName}.json`);
        fs.writeFileSync(outputFilePath, JSON.stringify(matchedData, null, 2));
        
        console.log(`Processed ${matchedData.length} matches for ${modelName}. Output saved to: ${outputFilePath}`);
        
        return outputFilePath;
    } catch (error) {
        console.error(`Error processing files in ${folderPath}: ${error.message}`);
        return null;
    }
}

// ------------------------------------------------------------------------
// PART 2: Extract code from response files using AST
// ------------------------------------------------------------------------

// Function to extract code blocks from response files using multiple methods
async function extractCodeBlock(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return "";
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract all lines starting with '>' first to get the response content
    try {
        const lines = fileContent.split('\n');
        const linesStartingWithGreaterThan = lines
            .filter(line => line.startsWith('>'))
            .map(line => line.substring(1).trim())
            .join('\n');
        
        // If there are no lines starting with '>', return empty string
        if (!linesStartingWithGreaterThan) {
            console.log(`No lines starting with '>' in ${filePath}`);
            return "";
        }
        
        console.log(`Found ${lines.filter(line => line.startsWith('>')).length} lines starting with '>' in ${filePath}`);
        
        // Method 1: Check for generated_code tags first
        const generatedCodeMatch = linesStartingWithGreaterThan.match(/<generated_code>([\s\S]*?)<\/generated_code>/);
        
        if (generatedCodeMatch && generatedCodeMatch[1]) {
            console.log(`Found <generated_code> tags in ${filePath}`);
            return generatedCodeMatch[1].trim();
        }
        
        // Method 2: Use regex to extract code from an it() function block
        console.log(`No <generated_code> tags found, trying regex pattern for it() blocks...`);
        const itBlockRegex = /it\((?:["'`])(?:[^"'`]*?)(?:["'`]),\s*(?:async\s*)?\(\)\s*=>\s*{([\s\S]*?)}\s*\)/g;
        const matches = [...linesStartingWithGreaterThan.matchAll(itBlockRegex)];
        
        if (matches && matches.length > 0) {
            // Take the first match if multiple are found
            console.log(`Found ${matches.length} it() blocks with regex in ${filePath}`);
            return matches[0][1].trim();
        }
        
        // Method 3: Use AST as a fallback for more complex cases
        console.log(`No it() blocks found with regex, applying AST parsing to extract code...`);
        const extractedCode = extractCodeUsingAST(linesStartingWithGreaterThan);
        
        if (extractedCode && extractedCode.length > 0) {
            return extractedCode;
        }
        
        // Method 4: Last resort - look for code blocks in markdown
        console.log(`AST parsing didn't find code, looking for code blocks...`);
        const codeBlockRegex = /```(?:js|javascript|ts|typescript)?\s*\n([\s\S]*?)\n```/g;
        const codeBlocks = [...linesStartingWithGreaterThan.matchAll(codeBlockRegex)];
        
        if (codeBlocks && codeBlocks.length > 0) {
            console.log(`Found ${codeBlocks.length} markdown code blocks in ${filePath}`);
            return codeBlocks[0][1].trim();
        }
        
        console.log(`No code could be extracted from ${filePath}`);
        return "";
    } catch (error) {
        console.error(`Error extracting code from ${filePath}: ${error.message}`);
        return "";
    }
}

// Function to extract code using TypeScript AST
function extractCodeUsingAST(codeText) {
    try {
        // Create a source file from the code text
        const sourceFile = ts.createSourceFile(
            'temp.ts',
            codeText,
            ts.ScriptTarget.Latest,
            true
        );
        
        let extractedCode = "";
        
        // Function to visit nodes in the AST
        function visit(node) {
            // Extract 'it' function calls for test blocks - top priority
            if (ts.isCallExpression(node) && 
                ts.isIdentifier(node.expression) && 
                node.expression.text === 'it') {
                
                // Extract the function body if it's an arrow function or function expression
                if (node.arguments.length >= 2) {
                    const secondArg = node.arguments[1];
                    
                    if (ts.isArrowFunction(secondArg) || ts.isFunctionExpression(secondArg)) {
                        if (secondArg.body && ts.isBlock(secondArg.body)) {
                            // Get the function body text
                            const bodyText = codeText.substring(
                                secondArg.body.pos + 1, // +1 to skip the opening brace
                                secondArg.body.end - 1  // -1 to skip the closing brace
                            );
                            extractedCode = bodyText.trim();
                            console.log(`Found 'it()' function with body length ${bodyText.length}`);
                            return;
                        }
                    }
                }
            }
            
            // Look for class declarations
            if (ts.isClassDeclaration(node) && node.name) {
                extractedCode = codeText.substring(node.pos, node.end);
                console.log(`Found class declaration: ${node.name.text}`);
                return;
            }
            
            // Look for function declarations
            if (ts.isFunctionDeclaration(node) && node.name) {
                extractedCode = codeText.substring(node.pos, node.end);
                console.log(`Found function declaration: ${node.name.text}`);
                return;
            }
            
            // Also extract arrow functions assigned to variables
            if (ts.isVariableStatement(node)) {
                for (const declaration of node.declarationList.declarations) {
                    if (declaration.initializer && 
                        (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) {
                        if (ts.isIdentifier(declaration.name)) {
                            console.log(`Found arrow function assigned to variable: ${declaration.name.text}`);
                        }
                        extractedCode = codeText.substring(node.pos, node.end);
                        return;
                    }
                }
            }
            
            // Extract export statements
            if (ts.isExportDeclaration(node) || 
                (ts.isExportAssignment(node) && ts.isIdentifier(node.expression))) {
                extractedCode = codeText.substring(node.pos, node.end);
                console.log(`Found export statement`);
                return;
            }
            
            // Go through children nodes
            ts.forEachChild(node, visit);
        }
        
        // Start the visitor pattern
        ts.forEachChild(sourceFile, visit);
        
        // If we found a specific block, return it
        if (extractedCode) {
            return extractedCode;
        }
        
        // If no specific code structures were found, return empty string
        return "";
    } catch (error) {
        console.error(`Error parsing code with AST: ${error.message}`);
        // Return empty string on error
        return "";
    }
}

// Function to process each matched data file
async function processMatchedDataFile(filePath) {
    console.log(`Processing matched data file: ${filePath}`);
    
    try {
        // Read the matched data file
        const matchedDataContent = fs.readFileSync(filePath, 'utf8');
        const matchedData = JSON.parse(matchedDataContent.replace(/^\/\/.*\n/, '').trim());
        
        // Process each item in the matched data
        let updatedCount = 0;
        
        for (let i = 0; i < matchedData.length; i++) {
            const item = matchedData[i];
            
            if (item && item.output_file) {
                // Construct the path to the response file
                const responseFilePath = path.join(PYWINAUTO_DIR, item.output_file);
                
                // Extract code from the response file
                try {
                    console.log(`Processing file ${i+1}/${matchedData.length}: ${item.output_file}`);
                    const code = await extractCodeBlock(responseFilePath);
                    
                    if (code && code.trim() !== "") {
                        matchedData[i].code = code;
                        updatedCount++;
                        console.log(`✓ Successfully extracted code from ${item.output_file}`);
                    } else {
                        console.log(`✗ No code found in ${item.output_file}`);
                    }
                } catch (err) {
                    console.error(`✗ Error extracting code from ${item.output_file}: ${err.message}`);
                }
            }
        }
        
        // Write the updated matched data back to the file
        fs.writeFileSync(filePath, JSON.stringify(matchedData, null, 2));
        console.log(`Updated ${updatedCount} items in ${filePath}`);
        
        return updatedCount;
    } catch (error) {
        console.error(`Error processing ${filePath}: ${error.message}`);
        return 0;
    }
}

// Main function to process all output folders
async function processAllOutputFolders() {
    console.log("Starting timestamp matching process...");
    
    // Get all directories in the pywinauto directory
    try {
        const items = fs.readdirSync(PYWINAUTO_DIR);
        
        // Filter out directories that start with "output_"
        const outputFolders = items
            .filter(item => {
                const fullPath = path.join(PYWINAUTO_DIR, item);
                return fs.statSync(fullPath).isDirectory() && item.startsWith('output_');
            })
            .map(folder => path.join(PYWINAUTO_DIR, folder));
        
        console.log(`Found ${outputFolders.length} output folders: ${outputFolders.map(f => path.basename(f)).join(', ')}`);
        
        // Process each output folder and immediately process the matched data file
        let totalUpdated = 0;
        
        for (const folder of outputFolders) {
            console.log(`\nProcessing folder: ${path.basename(folder)}`);
            
            // Step 1: Match timestamps and generate matched data file
            const matchedDataFile = await processOutputFolder(folder);
            
            if (matchedDataFile) {
                console.log(`\nExtracting code for: ${path.basename(folder)}`);
                
                // Step 2: Extract code from matched data file
                const updatedCount = await processMatchedDataFile(matchedDataFile);
                totalUpdated += updatedCount;
                
                console.log(`Completed processing for ${path.basename(folder)}: ${updatedCount} items updated`);
            }
        }
        
        console.log(`\nAll processing complete! Updated a total of ${totalUpdated} items.`);
    } catch (error) {
        console.error(`Error processing output folders:`, error);
    }
}

// Run the main function
processAllOutputFolders()
    .then(() => console.log('All processing complete!'))
    .catch(error => console.error('Error:', error));
