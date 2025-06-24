// process_all_data.js
const fs = require('fs-extra'); // Using fs-extra instead of fs for additional functionality
const path = require('path');
const readline = require('readline');
const moment = require('moment');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// LLM name mappings
const LLM_NAME_MAPPING = {
    'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
    'claude_3_7_sonnet': 'Claude 3.7 Sonnet',
    'claude_3_7_sonnet_thinking': 'claude 3.7 Sonnet Thinking',
    'claude_sonnet_4': 'claude Sonnet 4',
    'gemini_2_0_flash': 'Gemini 2.0 flash',
    'gemini_2_5_pro_preview': 'Gemini 2.5 Pro (Preview)',
    'gpt_4_1': 'GPT-4.1',
    'gpt_4o': 'GPT-4o',
    'o1_preview': 'o1 (Preview)',
    'o3_mini': 'o3-mini',
    'o4_mini_preview': 'o4-mini (Preview)'
};

// Function to extract testId from source file path
function extractTestId(sourceFilePath) {
    if (!sourceFilePath) return null;
    
    const fileName = path.basename(sourceFilePath, '.txt');
    // Remove .spec if present
    return fileName.replace(/\.spec$/, '');
}

// Function to get LLM names from normalized name
function getLLMNames(normalizedName) {
    const llmName = LLM_NAME_MAPPING[normalizedName] || normalizedName;
    return {
        llmName: llmName,
        llmNormalizedName: normalizedName
    };
}

// Base directory paths - using path relative to script's location
const DEFAULT_BASE_DIR = path.join(__dirname, '..');

// Global variables that will be set based on command line arguments
let BASE_DIR;
let PYWINAUTO_DIR;
let MATCHED_DATA_DIR;

// Function to initialize directory paths
function initializeDirectories(ctrfDataDir = null) {
    BASE_DIR = ctrfDataDir || DEFAULT_BASE_DIR;
    PYWINAUTO_DIR = path.join(BASE_DIR, 'pywinauto');
    MATCHED_DATA_DIR = path.join(BASE_DIR, 'matched_data');

    // Ensure the matched_data directory exists
    if (!fs.existsSync(MATCHED_DATA_DIR)) {
        console.log(`Creating directory: ${MATCHED_DATA_DIR}`);
        fs.mkdirSync(MATCHED_DATA_DIR, { recursive: true });
    }
    
    console.log(`Using CTRF data directory: ${BASE_DIR}`);
    console.log(`Pywinauto directory: ${PYWINAUTO_DIR}`);
    console.log(`Matched data directory: ${MATCHED_DATA_DIR}`);
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
            if (timing.timestamp) {
                copilotTimingMap.set(timing.timestamp, timing);
                copilotTimestamps.push(timing.timestamp);
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
                    
                    // Extract testId from source file
                    const testId = extractTestId(timestamp.source_file);
                    
                    // Get LLM names from model name
                    const llmNames = getLLMNames(modelName);
                    
                    // Create a matched entry
                    matchedData.push({
                        ...timestamp,
                        ...copilotTiming,
                        testId: testId,
                        llmName: llmNames.llmName,
                        llmNormalizedName: llmNames.llmNormalizedName,
                        code: "" // Will be filled in later
                    });
                }
            }
        }
        
        // Ensure all entries have a consistent "timestamp" field
        matchedData.forEach(entry => {
            // Make sure timestamp field is always present and used consistently
            if (!entry.timestamp && (entry.time || entry.ts)) {
                entry.timestamp = entry.time || entry.ts;
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

// Function to extract code specifically for Gemini 2.0 Flash (extracts only content inside it blocks)
function extractCodeFromFileGemini20Flash(fileContent) {
    let extractedTests = [];

    // 1. Aislar y limpiar el contenido del bloque de cita (líneas que empiezan con '>').
    const blockquoteLines = fileContent
        .split('\n') // Dividir el texto en líneas individuales.
        .filter(line => line.trim().startsWith('>')) // Quedarse solo con las líneas que forman parte de la cita[cite: 1].
        .map(line => line.replace(/^>\s?/, '')); // Quitar el símbolo '>' y el espacio opcional del inicio.

    let blockquoteContent = blockquoteLines.join('\n'); // Unir las líneas limpias de nuevo.
    console.log(`Contenido de cita extraído para Gemini 2.0 Flash: ${blockquoteContent.length} caracteres`);

    // 2. Remove markdown code block markers that Gemini 2.0 Flash includes
    blockquoteContent = blockquoteContent.replace(/```(?:languageId:typescript|typescript|ts)\s*\n?/g, '');
    blockquoteContent = blockquoteContent.replace(/\n?\s*```\s*$/g, '');
    blockquoteContent = blockquoteContent.trim();
    
    console.log(`Contenido después de limpiar marcadores de código: ${blockquoteContent.length} caracteres`);

    // Para Gemini 2.0 Flash, buscar directamente los bloques it() en el contenido de la cita
    try {
        // Parse the entire blockquote content as TypeScript/JavaScript
        const ast = parser.parse(blockquoteContent, {
            sourceType: "module",
            plugins: ["typescript"],
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true
        });

        // Traverse the AST to find it() blocks
        traverse(ast, {
            CallExpression(path) {
                const callee = path.get('callee');
                if (callee.isIdentifier({ name: 'it' }) && path.node.arguments[0]) {
                    const testName = path.node.arguments[0].value;
                    console.log(`Encontrado test en Gemini 2.0 Flash: "${testName}"`);
                    
                    const callback = path.get('arguments.1');
                    if (callback.isArrowFunctionExpression() || callback.isFunctionExpression()) {
                        const bodyNode = callback.get('body').node;
                        
                        // Generate the code string and clean it
                        const generated = generate(bodyNode, {});
                        const testCode = generated.code.slice(1, -1).trim();

                        extractedTests.push({
                            testName: testName,
                            code: testCode
                        });

                        console.log(`Código extraído del test en Gemini 2.0 Flash: "${testName}" (${testCode.length} caracteres)`);
                    }
                }
            }
        });

        if (extractedTests.length > 0) {
            console.log(`Se extrajeron ${extractedTests.length} test(s) de Gemini 2.0 Flash`);
            return extractedTests;
        } else {
            console.log("No se encontraron bloques it() en el contenido de Gemini 2.0 Flash");
            return null;
        }

    } catch (error) {
        console.error("Error al analizar el código de Gemini 2.0 Flash:", error.message);
        console.log("Intentando extraer código mediante regex como fallback...");
        
        // Fallback: try to extract using regex instead of AST parsing
        try {
            // Look for it() blocks using regex
            const itBlockRegex = /it\s*\(\s*["']([^"']+)["']\s*,\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\);?/g;
            let match;
            
            while ((match = itBlockRegex.exec(blockquoteContent)) !== null) {
                const testName = match[1];
                const testCode = match[2].trim();
                
                extractedTests.push({
                    testName: testName,
                    code: testCode
                });
                
                console.log(`Código extraído con regex fallback: "${testName}" (${testCode.length} caracteres)`);
            }
            
            if (extractedTests.length > 0) {
                return extractedTests;
            } else {
                console.log("No se pudieron extraer bloques it() con regex fallback");
                return null;
            }
        } catch (regexError) {
            console.error("Error en regex fallback:", regexError.message);
            return null;
        }
    }
}

// Function to extract code from file content (same logic as extract.js)
function extractCodeFromFile(fileContent) {
    let extractedTests = [];

    // 1. Aislar y limpiar el contenido del bloque de cita (líneas que empiezan con '>').
    const blockquoteLines = fileContent
        .split('\n') // Dividir el texto en líneas individuales.
        .filter(line => line.trim().startsWith('>')) // Quedarse solo con las líneas que forman parte de la cita[cite: 1].
        .map(line => line.replace(/^>\s?/, '')); // Quitar el símbolo '>' y el espacio opcional del inicio.

    const blockquoteContent = blockquoteLines.join('\n'); // Unir las líneas limpias de nuevo.
    console.log(`Contenido de cita extraído: ${blockquoteContent.length} caracteres`);// 2. Extraer el bloque de código de la cita ya limpia.
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
        
        // Check if this is a Gemini 2.0 Flash file by looking at the path
        const isGemini20Flash = filePath.includes('output_gemini_2_0_flash');
        
        let result;
        if (isGemini20Flash) {
            console.log("Detectado archivo de Gemini 2.0 Flash - usando procesado específico");
            result = extractCodeFromFileGemini20Flash(fileContent);
        } else {
            result = extractCodeFromFile(fileContent);
        }
        
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
async function processAllOutputFolders(specificFolder = null, ctrfDataDir = null) {
    // Initialize directories based on provided CTRF data directory
    initializeDirectories(ctrfDataDir);
    
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
        }
    }
    
    return options;
}

// Add usage information
function printUsage() {
    console.log(`
Usage: node process_all_data3.js [options]

Options:
  --folder, -f <folder_name>    Process only the specified folder
                                Provide just the folder name (e.g., "output_gpt4"), not the full path
  --ctrf-dir, -c <directory>    Specify the directory containing CTRF data
                                If not provided, uses the default directory

Examples:
  node process_all_data3.js                                        # Process all output folders with default directory
  node process_all_data3.js -f output_gpt4                         # Process only the output_gpt4 folder with default directory
  node process_all_data3.js -c /path/to/ctrf/data                  # Process all folders in specified CTRF directory
  node process_all_data3.js -f output_gpt4 -c /path/to/ctrf/data   # Process specific folder in specified CTRF directory
`);
}

// Run the main function with optional folder parameter
const options = parseArgs();

// Show usage if --help flag is present
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
} else {
    processAllOutputFolders(options.folder, options.ctrfDir)
        .then(() => console.log('All processing complete!'))
        .catch(error => console.error('Error:', error));
}
