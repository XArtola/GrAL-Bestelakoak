// process_all_data.js
const fs = require('fs-extra'); // Using fs-extra instead of fs for additional functionality
const path = require('path');
const readline = require('readline');
const moment = require('moment');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// Base directory paths - using path relative to script's location
const DEFAULT_BASE_DIR = path.join(__dirname, '..');

// Global variables that will be set based on command line arguments
let BASE_DIR;
let PYWINAUTO_DIR;
let MATCHED_DATA_DIR;

// Load normalized LLM names mapping
let normalizedLlmNames = [];
try {
    const normalizedNamesPath = path.join(__dirname, '..', 'normalized_llm_names.json');
    if (fs.existsSync(normalizedNamesPath)) {
        const content = fs.readFileSync(normalizedNamesPath, 'utf8');
        const cleanContent = content.replace(/^\/\/.*\n/, '').trim();
        normalizedLlmNames = JSON.parse(cleanContent);
        console.log(`Loaded ${normalizedLlmNames.length} normalized LLM names`);
    }
} catch (error) {
    console.warn(`Could not load normalized LLM names: ${error.message}`);
}

// Function to get normalized LLM name from folder name
function getNormalizedLlmName(folderName) {
    // Remove 'output_' prefix to get the model name
    const modelName = folderName.replace('output_', '');
    
    // Find matching normalized name
    const found = normalizedLlmNames.find(item => item.nombre_normalizado === modelName);
    
    if (found) {
        return {
            originalName: found.nombre_original,
            normalizedName: found.nombre_normalizado
        };
    }
    
    // Fallback: return the model name as both original and normalized
    return {
        originalName: modelName,
        normalizedName: modelName
    };
}

// Function to initialize directory paths
function initializeDirectories(ctrfDataDir = null, sourceDataDir = null, outputDataDir = null) {
    BASE_DIR = ctrfDataDir || DEFAULT_BASE_DIR;
    
    // Set source directory for data processing (where output folders are located)
    PYWINAUTO_DIR = sourceDataDir ? sourceDataDir : path.join(BASE_DIR, 'pywinauto');
    
    // Set output directory for saving results
    MATCHED_DATA_DIR = outputDataDir ? outputDataDir : path.join(BASE_DIR, 'matched_data');

    // Ensure the matched_data directory exists
    if (!fs.existsSync(MATCHED_DATA_DIR)) {
        console.log(`Creating directory: ${MATCHED_DATA_DIR}`);
        fs.mkdirSync(MATCHED_DATA_DIR, { recursive: true });
    }
    
    console.log(`Using CTRF data directory: ${BASE_DIR}`);
    console.log(`Source data directory (pywinauto): ${PYWINAUTO_DIR}`);
    console.log(`Output directory (matched_data): ${MATCHED_DATA_DIR}`);
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
    
    // Get normalized LLM name information
    const llmInfo = getNormalizedLlmName(folderName);
    console.log(`LLM Info: ${llmInfo.originalName} (${llmInfo.normalizedName})`);
    
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
        console.log(`Copilot timing data loaded with ${copilotTimingData.length} entries`);        // Create a map of timestamp values to copilot timing objects
        const copilotTimingMap = new Map();
        const copilotTimestamps = [];
        
        copilotTimingData.forEach(timing => {
            // Use either requestTimestamp or timestamp field
            const timestampValue = timing.requestTimestamp || timing.timestamp;
            if (timestampValue) {
                copilotTimingMap.set(timestampValue, timing);
                copilotTimestamps.push(timestampValue);
            }
        });
        
        // Match timestamp entries with copilot timing entries
        const matchedData = [];
        const processedTimestamps = new Set();
          for (const timestamp of timestampData) {
            // Use either timestamp or any other timestamp field
            const timestampValue = timestamp.timestamp || timestamp.requestTimestamp || timestamp.time || timestamp.ts;
            if (!timestampValue) continue;
            
            const closestTimestamp = findClosestTimestamp(timestampValue, copilotTimestamps);
            
            if (closestTimestamp && !processedTimestamps.has(closestTimestamp)) {
                const copilotTiming = copilotTimingMap.get(closestTimestamp);
                
                if (copilotTiming) {
                    // Mark this timestamp as processed
                    processedTimestamps.add(closestTimestamp);
                      // Extract ID from output_file name
                    let testId = "";
                    if (timestamp.output_file) {
                        // Extract filename from path (handle both forward and backward slashes)
                        const fileName = timestamp.output_file.split(/[/\\]/).pop();
                        // Extract the part before '_response_' (e.g., "auth1.spec" from "auth1.spec_response_claude_3_5_sonnet_20250520_204403.txt")
                        const match = fileName.match(/^(.+?)\.spec_response_/);
                        if (match) {
                            testId = match[1]; // e.g., "auth1"
                        }
                    }
                      // Create a matched entry
                    matchedData.push({
                        ...timestamp,
                        ...copilotTiming,
                        testId: testId,
                        llmName: llmInfo.originalName,
                        llmNormalizedName: llmInfo.normalizedName,
                        code: "" // Will be filled in later
                    });
                }
            }
        }        // Ensure all entries have a consistent "timestamp" field
        matchedData.forEach(entry => {
            // Make sure timestamp field is always present and used consistently
            // Priority: timestamp > requestTimestamp > time > ts
            if (!entry.timestamp && (entry.requestTimestamp || entry.time || entry.ts)) {
                entry.timestamp = entry.requestTimestamp || entry.time || entry.ts;
            }
        });
        
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
// PART 2: Extract code from response files using extract.js logic
// ------------------------------------------------------------------------

// Function to extract code from file content (same logic as extract.js)
function extractCodeFromFile(fileContent) {
    let extractedTests = [];

    // 1. Aislar y limpiar el contenido del bloque de cita (líneas que empiezan con '>').
    const blockquoteLines = fileContent
        .split('\n') // Dividir el texto en líneas individuales.
        .filter(line => line.trim().startsWith('>')) // Quedarse solo con las líneas que forman parte de la cita[cite: 1].
        .map(line => line.replace(/^>\s?/, '')); // Quitar el símbolo '>' y el espacio opcional del inicio.

    const blockquoteContent = blockquoteLines.join('\n'); // Unir las líneas limpias de nuevo.
    console.log(`Contenido de cita extraído: ${blockquoteContent.length} caracteres`);    // 2. Extraer el bloque de código de la cita ya limpia.
    // First try to find regular code blocks (typescript/ts)
    let codeToProcess = null;
    const codeBlockRegex = /```(?:typescript|ts)\s*([\s\S]*?)\s*```/;
    const codeBlockMatch = blockquoteContent.match(codeBlockRegex);
    
    if (codeBlockMatch && codeBlockMatch[1]) {
        console.log("Encontrado bloque de código typescript/ts");
        codeToProcess = codeBlockMatch[1];
        
        // Check if this code contains it() blocks
        const hasItBlocks = /\bit\s*\([^)]*,/.test(codeToProcess);
        
        if (hasItBlocks) {
            console.log("El código contiene bloques it(), procesando como código normal");
        } else {
            // If no it() blocks found, check for <generated_code> tags as fallback
            const generatedCodeRegex = /<generated_code>\s*([\s\S]*?)\s*<\/generated_code>/;
            const generatedMatch = blockquoteContent.match(generatedCodeRegex);
            
            if (generatedMatch && generatedMatch[1]) {
                console.log("No se encontraron bloques it(), pero hay <generated_code> tags - usando como fallback");
                codeToProcess = generatedMatch[1].trim();
            }
        }
    } else {
        // If no typescript/ts code blocks, then look for <generated_code> tags
        const generatedCodeRegex = /<generated_code>\s*([\s\S]*?)\s*<\/generated_code>/;
        const generatedMatch = blockquoteContent.match(generatedCodeRegex);
        
        if (generatedMatch && generatedMatch[1]) {
            console.log("Encontrado código dentro de <generated_code> tags (sin bloques typescript/ts)");
            codeToProcess = generatedMatch[1].trim();
        }
    }

    if (codeToProcess) {
        // Clean up the code before processing
        codeToProcess = codeToProcess.trim();
        console.log(`Bloque de código encontrado: ${codeToProcess.length} caracteres`);
        console.log(`Primeros 100 caracteres: "${codeToProcess.substring(0, 100)}..."`);

        try {
            // 3. Convertir el código aislado en un AST (Árbol de Sintaxis Abstracta).
            const ast = parser.parse(codeToProcess, {
                sourceType: "module",
                plugins: ["typescript"],
                allowImportExportEverywhere: true,
                allowReturnOutsideFunction: true
            });

            // 4. Recorrer el AST para encontrar el contenido de todos los bloques it().
            let foundItBlocks = false;
            traverse(ast, {
                CallExpression(path) {
                    const callee = path.get('callee');
                    if (callee.isIdentifier({ name: 'it' }) && path.node.arguments[0]) {
                        foundItBlocks = true;
                        const testName = path.node.arguments[0].value;
                        console.log(`Encontrado test: "${testName}"`);
                        
                        const callback = path.get('arguments.1');
                        if (callback.isArrowFunctionExpression() || callback.isFunctionExpression()) {
                            const bodyNode = callback.get('body').node;
                            
                            // 5. Generar la cadena de texto y limpiarla.
                            const generated = generate(bodyNode, {});
                            const testCode = generated.code.slice(1, -1).trim();

                            extractedTests.push({
                                testName: testName,
                                code: testCode
                            });

                            console.log(`Código extraído del test: "${testName}" (${testCode.length} caracteres)`);
                        }
                    }
                }
            });

            // Si no se encontraron bloques it(), extraer todo el código como un test genérico
            if (!foundItBlocks) {
                console.log("No se encontraron bloques it(), extrayendo todo el código como test genérico");
                
                // Buscar comentarios que puedan indicar el nombre del test
                let testName = "Generic Test";
                const firstComment = codeToProcess.match(/\/\/\s*(.+)/);
                if (firstComment && firstComment[1]) {
                    testName = firstComment[1].trim();
                }
                
                extractedTests.push({
                    testName: testName,
                    code: codeToProcess.trim()
                });
            }

        } catch (error) {
            console.error("Error al analizar el código:", error.message);
            console.log("Intentando extraer como código genérico sin parsing...");
            
            // Fallback: extraer todo el código sin parsing
            let testName = "Generic Test (Parse Failed)";
            const firstComment = codeToProcess.match(/\/\/\s*(.+)/);
            if (firstComment && firstComment[1]) {
                testName = firstComment[1].trim();
            }
            
            extractedTests.push({
                testName: testName,
                code: codeToProcess.trim()
            });
            
            console.log(`Código extraído como fallback: "${testName}" (${codeToProcess.length} caracteres)`);
        }
    } else {
        console.log("No se encontró un bloque de código typescript/ts dentro de la sección de cita.");
        // Intentar buscar bloques de código sin especificar lenguaje
        const genericCodeBlockRegex = /```\n([\s\S]*?)\n```/;
        const genericMatch = blockquoteContent.match(genericCodeBlockRegex);
        if (genericMatch) {
            console.log("Se encontró un bloque de código genérico, pero no se pudo procesar como TypeScript");
        }
        return null;
    }

    // Imprimir el resultado final
    console.log("--- CÓDIGO EXTRAÍDO ---");
    if (extractedTests.length > 0) {
        console.log(`Se extrajeron ${extractedTests.length} test(s):`);
        extractedTests.forEach((test, index) => {
            console.log(`${index + 1}. ${test.testName}`);
        });
        return extractedTests;
    } else {
        console.log("No se extrajo ningún código de test");
        return null;
    }
}

// Function to extract code blocks from response files using extract.js logic
async function extractCodeBlock(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return "";
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log(`Procesando archivo: ${filePath}`);
        
        const result = extractCodeFromFile(fileContent);
        
        if (result && result.length > 0) {
            // Return the code from the first test found
            // If you want to concatenate all tests, you can modify this logic
            return result[0].code;
        } else {
            console.log(`No code could be extracted from ${filePath}`);
            return "";
        }
    } catch (error) {
        console.error(`Error extracting code from ${filePath}: ${error.message}`);
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

// Main function to process all output folders or a specific folder
async function processAllOutputFolders(specificFolder = null, ctrfDataDir = null, sourceDataDir = null, outputDataDir = null) {
    // Initialize directories based on provided arguments
    initializeDirectories(ctrfDataDir, sourceDataDir, outputDataDir);
    
    console.log("Starting timestamp matching process...");
    
    // Get directories in the pywinauto directory
    try {
        let outputFolders = [];
        
        if (specificFolder) {
            // Process only the specific folder
            const folderPath = path.join(PYWINAUTO_DIR, specificFolder);
            if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
                console.log(`Processing specified folder: ${specificFolder}`);
                outputFolders = [folderPath];
            } else {
                console.error(`Specified folder not found: ${specificFolder}`);
                return;
            }
        } else {
            // Process all output folders
            const items = fs.readdirSync(PYWINAUTO_DIR);
            
            // Filter out directories that start with "output_"
            outputFolders = items
                .filter(item => {
                    const fullPath = path.join(PYWINAUTO_DIR, item);
                    return fs.statSync(fullPath).isDirectory() && item.startsWith('output_');
                })
                .map(folder => path.join(PYWINAUTO_DIR, folder));
            
            console.log(`Found ${outputFolders.length} output folders: ${outputFolders.map(f => path.basename(f)).join(', ')}`);
        }
        
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

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--folder' || args[i] === '-f') {
            options.folder = args[i + 1];
            i++; // Skip the next argument since we've used it
        } else if (args[i] === '--ctrf-dir' || args[i] === '-c') {
            options.ctrfDir = args[i + 1];
            i++; // Skip the next argument since we've used it
        } else if (args[i] === '--source-dir' || args[i] === '-s') {
            options.sourceDir = args[i + 1];
            i++; // Skip the next argument since we've used it
        } else if (args[i] === '--output-dir' || args[i] === '-o') {
            options.outputDir = args[i + 1];
            i++; // Skip the next argument since we've used it
        }
    }
    
    return options;
}

// Add usage information
function printUsage() {
    console.log(`
Usage: node process_result_times.js [options]

Options:
  --folder, -f <folder_name>    Process only the specified folder
                                Provide just the folder name (e.g., "output_gpt4"), not the full path
  --ctrf-dir, -c <directory>    Specify the directory containing CTRF data
                                If not provided, uses the default directory
  --source-dir, -s <directory>  Specify the source directory containing folders to process
                                If not provided, uses the 'pywinauto' subdirectory of CTRF data dir
  --output-dir, -o <directory>  Specify the output directory where results will be saved
                                If not provided, uses the 'matched_data' subdirectory of CTRF data dir

Examples:
  node process_result_times.js                                                      # Process all output folders with default directories
  node process_result_times.js -f output_gpt4                                       # Process only the output_gpt4 folder with default directories
  node process_result_times.js -c /path/to/ctrf/data                                # Process all folders in specified CTRF directory
  node process_result_times.js -s /path/to/source/data                              # Process folders from custom source directory
  node process_result_times.js -o /path/to/output/results                           # Save results to custom output directory
  node process_result_times.js -f output_gpt4 -c /path/to/ctrf/data                 # Process specific folder in specified CTRF directory
  node process_result_times.js -s /path/to/source -o /path/to/output                # Use custom source and output directories
  node process_result_times.js -f output_gpt4 -s /path/to/source -o /path/to/output # Process specific folder with custom directories
`);
}

// Run the main function with optional folder parameter
const options = parseArgs();

// Show usage if --help flag is present
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
} else {
    processAllOutputFolders(options.folder, options.ctrfDir, options.sourceDir, options.outputDir)
        .then(() => console.log('All processing complete!'))
        .catch(error => console.error('Error:', error));
}
