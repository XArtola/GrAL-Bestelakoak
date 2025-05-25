const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Directory containing the output_ folders
const rootDir = __dirname;

// Function to get all directories starting with "output_"
function getOutputDirectories() {
    return fs.readdirSync(rootDir)
        .filter(item => {
            const itemPath = path.join(rootDir, item);
            return fs.statSync(itemPath).isDirectory() && item.startsWith('output_');
        })
        .map(dir => path.join(rootDir, dir));
}

// Function to extract code from response file
function extractCodeFromResponseFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return "";
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        let extractedCode = "";
        let isInsideCodeBlock = false;
        let isInsideGeneratedCode = false;
        
        // Look for both types of code blocks:
        // 1. Between >```typescript and >```
        // 2. Between >         // <generated_code> and >         // </generated_code>
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for typescript code block
            if (line.startsWith('>```typescript') || line.startsWith('> ```typescript')) {
                isInsideCodeBlock = true;
                continue;
            } else if ((isInsideCodeBlock) && (line.startsWith('>```') || line.startsWith('> ```'))) {
                isInsideCodeBlock = false;
                break;  // Found the end of the first code block, so we're done
            }
            
            // Check for generated_code markers
            if (line.includes('// <generated_code>') && line.startsWith('>')) {
                isInsideGeneratedCode = true;
                continue;
            } else if ((isInsideGeneratedCode) && line.includes('// </generated_code>') && line.startsWith('>')) {
                isInsideGeneratedCode = false;
                break;  // Found the end of the generated code block
            }
            
            // Collect code lines
            if (isInsideCodeBlock || isInsideGeneratedCode) {
                // Remove the leading '>' and trim
                let codeLine = line;
                if (line.startsWith('> ')) {
                    codeLine = line.substring(2);
                } else if (line.startsWith('>')) {
                    codeLine = line.substring(1);
                }
                extractedCode += codeLine + '\n';
            }
        }
        
        return extractedCode.trim();
    } catch (error) {
        console.error(`Error extracting code from ${filePath}:`, error);
        return "";
    }
}

// Process each output directory
async function processOutputDirectories() {
    const outputDirs = getOutputDirectories();
    
    for (const dir of outputDirs) {
        const dirName = path.basename(dir);
        console.log(`Processing directory: ${dirName}`);
        
        // Model name is the part after "output_"
        const modelName = dirName.substring(7);
        
        // Find the timestamps file
        const timestampsFiles = fs.readdirSync(dir)
            .filter(file => file.startsWith('timestamps_') && file.endsWith('.json'));
        
        if (timestampsFiles.length === 0) {
            console.log(`No timestamps file found in ${dirName}`);
            continue;
        }
        
        const timestampsFile = path.join(dir, timestampsFiles[0]);
        
        // Find the corresponding copilot_timings file
        const copilotTimingsFile = path.join(rootDir, `processing_time_${modelName}.json`);
        
        if (!fs.existsSync(copilotTimingsFile)) {
            console.log(`No copilot_timings file found for ${modelName}`);
            continue;
        }
        
        // Read the files
        const timestamps = JSON.parse(fs.readFileSync(timestampsFile, 'utf8'));
        const copilotTimings = JSON.parse(fs.readFileSync(copilotTimingsFile, 'utf8'));
        
        // Match records and add code
        const matchedRecords = [];
        const processedCopilotTimings = new Set();
        
        for (const ts of timestamps) {
            const tsDateTime = new Date(ts.timestamp);
            
            // Find matching copilot record
            for (const ct of copilotTimings) {
                if (processedCopilotTimings.has(ct.requestId)) {
                    continue;  // Skip already processed records
                }
                
                const ctDateTime = new Date(ct.requestTimestamp);
                
                // Check if timestamps are within 5 minutes of each other
                const timeDiff = Math.abs(tsDateTime - ctDateTime);
                const minutesDiff = timeDiff / (1000 * 60);
                
                if (minutesDiff <= 5) {
                    // Extract code from the response file
                    const outputFile = ts.output_file;
                    const responseFilePath = path.join(rootDir, outputFile);
                    
                    const extractedCode = extractCodeFromResponseFile(responseFilePath);
                    
                    // Create a matched record
                    const matchedRecord = {
                        ...ts,
                        ...ct,
                        code: extractedCode
                    };
                    
                    matchedRecords.push(matchedRecord);
                    processedCopilotTimings.add(ct.requestId);
                    break;  // Move to the next timestamp
                }
            }
        }
        
        // Write the matched records to a new file
        const outputFile = path.join(rootDir, `matched_data_${modelName}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(matchedRecords, null, 2));
        console.log(`Matched data saved to: ${outputFile}`);
    }
}

// Run the processing
processOutputDirectories().then(() => {
    console.log('Processing completed');
}).catch(error => {
    console.error('Error during processing:', error);
});
