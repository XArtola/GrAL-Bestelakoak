// process_all_data.js
const fs = require('fs-extra'); // Using fs-extra instead of fs for additional functionality
const path = require('path');
const readline = require('readline');
const moment = require('moment');

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
// PART 2: Extract code from response files
// ------------------------------------------------------------------------

// Function to extract code blocks from response files using different strategies
async function extractCodeBlock(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return "";
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract all lines starting with '>'
    const lines = fileContent.split('\n');
    const linesStartingWithGreaterThan = lines
        .filter(line => line.startsWith('>'))
        .map(line => line.substring(1).trim())
        .join('\n');
    
    // If there are no lines starting with '>', return empty string
    if (!linesStartingWithGreaterThan) {
        return "";
    }
    
    // Strategy 1: Look for code blocks between ```typescript or ```javascript and ``` markers
    const codeBlockRegex = /```(?:typescript|javascript)?\s*\n([\s\S]*?)\n```/;
    const codeBlockMatch = linesStartingWithGreaterThan.match(codeBlockRegex);
    if (codeBlockMatch && codeBlockMatch[1]) {
        return codeBlockMatch[1];
    }
    
    // Strategy 2: Look for code blocks between <generated_code> and </generated_code> markers
    const generatedCodeRegex = /\/\/ <generated_code>([\s\S]*?)\/\/ <\/generated_code>/;
    const generatedCodeMatch = linesStartingWithGreaterThan.match(generatedCodeRegex);
    if (generatedCodeMatch && generatedCodeMatch[1]) {
        return generatedCodeMatch[1].trim();
    }
    
    // Strategy 3: Look for it() function blocks
    // Extract it blocks using regex since we can't rely on AST parsing
    const itBlockRegex = /it\(\s*["'](.*?)["']\s*,\s*(?:\(\s*\)\s*=>|function\s*\(\s*\)\s*)\s*{([\s\S]*?)}\s*\)\s*;/g;
    const itBlockMatches = [...linesStartingWithGreaterThan.matchAll(itBlockRegex)];
    
    if (itBlockMatches && itBlockMatches.length > 0) {
        // Return the content of the first it block
        return itBlockMatches[0][2].trim();
    }
    
    // Fallback: If all strategies fail, return all lines starting with '>'
    // but cleaned up a bit (remove code block markers if any)
    return linesStartingWithGreaterThan
        .replace(/```typescript\s*\n/g, '')
        .replace(/```javascript\s*\n/g, '')
        .replace(/```\s*$/g, '')
        .trim();
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
                console.log(`  Extracting code from: ${responseFilePath}`);
                const code = await extractCodeBlock(responseFilePath);
                
                // Update the item with the extracted code
                if (code && code.length > 0) {
                    matchedData[i].code = code;
                    updatedCount++;
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
        
        // Process each output folder and collect the paths to the generated matched data files
        const matchedDataFiles = [];
        
        for (const folder of outputFolders) {
            const matchedDataFile = await processOutputFolder(folder);
            if (matchedDataFile) {
                matchedDataFiles.push(matchedDataFile);
            }
        }
        
        console.log("\nStarting code extraction process...");
        
        // Process each matched data file to extract code
        let totalUpdated = 0;
        
        for (const filePath of matchedDataFiles) {
            const updatedCount = await processMatchedDataFile(filePath);
            totalUpdated += updatedCount;
        }
        
        console.log(`\nProcessing complete! Updated a total of ${totalUpdated} items.`);
    } catch (error) {
        console.error(`Error reading directory ${PYWINAUTO_DIR}:`, error);
    }
}

// Run the main function
processAllOutputFolders()
    .then(() => console.log('All processing complete!'))
    .catch(error => console.error('Error:', error));
