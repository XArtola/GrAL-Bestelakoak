const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

console.log('=== AST-BASED TEST GENERATOR STARTING ===');
console.log(`Current script directory: ${__dirname}`);

// Parse command-line arguments to find a specific folder to process
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--folder=')) {
      options.folder = arg.split('=')[1];
    }
  });
  
  return options;
}

const options = parseArgs();
console.log(`Command line options: ${JSON.stringify(options)}`);

/**
 * Parse source code into AST with proper TypeScript/JavaScript support
 */
function parseSourceCode(sourceCode, filePath) {
  const isTypeScript = path.extname(filePath) === '.ts';
  
  try {
    return parser.parse(sourceCode, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'jsx',
        'asyncGenerators',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        ...(isTypeScript ? ['typescript'] : [])
      ]
    });
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Find and analyze it() blocks in the AST
 */
function findItBlocks(ast) {
  const itBlocks = [];
  
  traverse(ast, {
    CallExpression(path) {
      const { node } = path;
      
      // Check if this is an it() call
      if (t.isIdentifier(node.callee, { name: 'it' })) {
        const args = node.arguments;
        
        if (args.length >= 2) {
          const testName = args[0];
          const callback = args[1];
          
          // Analyze the callback function
          if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
            const body = callback.body;
            let isEmpty = false;
            
            // Check if the function body is empty
            if (t.isBlockStatement(body)) {
              isEmpty = body.body.length === 0;
            } else {
              // Arrow function with expression body is considered non-empty
              isEmpty = false;
            }
            
            itBlocks.push({
              path,
              node,
              testName: t.isStringLiteral(testName) ? testName.value : 'unknown',
              callback,
              isEmpty
            });
          }
        }
      }
    }
  });
  
  return itBlocks;
}

/**
 * Insert code into an empty it() block using AST transformation
 */
function insertCodeIntoItBlock(ast, newCode, targetItBlock) {
  try {
    // Parse the new code to insert
    const newCodeAst = parser.parse(newCode, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins: ['jsx', 'typescript']
    });
    
    // Extract statements from the new code
    const statements = newCodeAst.body;
    
    // Insert the statements into the it() block
    const callback = targetItBlock.callback;
    if (t.isBlockStatement(callback.body)) {
      callback.body.body = statements;
    } else {
      // Convert expression to block statement and add our code
      callback.body = t.blockStatement(statements);
    }
    
    return true;
  } catch (error) {
    console.error('Error inserting code into it() block:', error.message);
    return false;
  }
}

/**
 * Process a source file and insert code using AST
 */
function processFileWithAST(sourcePath, destPath, codeToInsert) {
  try {
    console.log(`Processing file with AST: ${sourcePath}`);
    
    // Read the original file
    const originalContent = fs.readFileSync(sourcePath, 'utf8');
    console.log(`Read original content, length: ${originalContent.length} characters`);
    
    // Parse into AST
    const ast = parseSourceCode(originalContent, sourcePath);
    console.log('Successfully parsed source code into AST');
    
    // Find it() blocks
    const itBlocks = findItBlocks(ast);
    console.log(`Found ${itBlocks.length} it() blocks`);
    
    if (itBlocks.length === 0) {
      console.log('No it() blocks found, copying file as-is');
      fs.copyFileSync(sourcePath, destPath);
      return { modified: false, reason: 'no_it_blocks' };
    }
    
    // Find the first empty it() block
    const emptyItBlock = itBlocks.find(block => block.isEmpty);
    
    if (!emptyItBlock) {
      console.log('All it() blocks already have content, copying file as-is');
      fs.copyFileSync(sourcePath, destPath);
      return { modified: false, reason: 'all_blocks_have_content' };
    }
    
    console.log(`Found empty it() block: "${emptyItBlock.testName}"`);
    
    // Insert the code
    const insertSuccess = insertCodeIntoItBlock(ast, codeToInsert, emptyItBlock);
    
    if (!insertSuccess) {
      console.log('Failed to insert code, copying original file');
      fs.copyFileSync(sourcePath, destPath);
      return { modified: false, reason: 'insert_failed' };
    }
    
    // Generate the modified code with proper formatting
    const result = generate(ast, {
      retainLines: false,
      compact: false,
      concise: false,
      quotes: 'double',
      // Preserve original formatting where possible
      formatters: {
        compact: false,
        indent: {
          style: '  ' // 2-space indentation
        }
      }
    });
    
    // Write the modified content
    fs.writeFileSync(destPath, result.code);
    console.log(`Successfully modified and saved file: ${destPath}`);
    
    return { modified: true, reason: 'success' };
    
  } catch (error) {
    console.error(`Error processing file with AST: ${error.message}`);
    console.log('Falling back to copying original file');
    fs.copyFileSync(sourcePath, destPath);
    return { modified: false, reason: 'error', error: error.message };
  }
}

// Base pywinauto directory
const pywinautoDir = path.join(__dirname, '..', 'pywinauto');
console.log(`Pywinauto directory: ${pywinautoDir}`);
console.log(`Directory exists?: ${fs.existsSync(pywinautoDir) ? 'Yes' : 'No'}`);

// Find all directories with output_ prefix
const outputDirPattern = path.join(pywinautoDir, 'output_*');
console.log(`Looking for output directories with pattern: ${outputDirPattern}`);

// Use specified folder or find all output_ folders
let outputDirs = [];
try {
  if (options.folder) {
    const folderPath = options.folder.startsWith('/') || options.folder.includes(':')
      ? options.folder
      : path.join(pywinautoDir, options.folder);
    
    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      outputDirs = [folderPath];
      console.log(`Using specified folder: ${folderPath}`);
    } else {
      console.error(`Specified folder does not exist or is not a directory: ${folderPath}`);
      process.exit(1);
    }
  } else {
    const allItems = fs.readdirSync(pywinautoDir);
    outputDirs = allItems
      .filter(item => item.startsWith('output_'))
      .map(dir => path.join(pywinautoDir, dir))
      .filter(dirPath => fs.statSync(dirPath).isDirectory());
  }
  
  console.log(`Found ${outputDirs.length} output ${outputDirs.length === 1 ? 'directory' : 'directories'}: ${outputDirs.join(', ')}`);
} catch (err) {
  console.error(`Error accessing directories: ${err.message}`);
  process.exit(1);
}

// Source directory for template files
const resultsDir = path.join(__dirname, '..', 'ui', 'results');
console.log(`Results directory: ${resultsDir}`);
console.log(`Results directory exists?: ${fs.existsSync(resultsDir) ? 'Yes' : 'No'}`);

// Base directory for complete test files
const completeTestsDir = path.join(__dirname, '..', 'ui', 'complete_tests');
console.log(`Complete tests directory: ${completeTestsDir}`);

if (!fs.existsSync(completeTestsDir)) {
  console.log(`Creating complete tests directory: ${completeTestsDir}`);
  fs.mkdirSync(completeTestsDir, { recursive: true });
} else {
  console.log(`Complete tests directory already exists`);
}

// Statistics tracking - CORREGIDO: incluye skipped e invalid
const stats = {
  total: 0,
  modified: 0,
  copied: 0,
  skipped: 0,    // Entradas sin archivo plantilla
  invalid: 0,    // Entradas con campos faltantes
  errors: 0
};

// Process each output directory
outputDirs.forEach(outputDir => {
  const dirName = path.basename(outputDir);
  const modelName = dirName.replace('output_', '');
  
  console.log(`Processing directory ${outputDir} for model ${modelName}...`);
  
  // Look for matched data JSON file
  const matchedDataDir = path.join(__dirname, '..', 'matched_data');
  console.log(`Looking for matched data in directory: ${matchedDataDir}`);
  console.log(`Matched data directory exists?: ${fs.existsSync(matchedDataDir) ? 'Yes' : 'No'}`);
  
  const jsonFilename = `matched_data_${modelName}.json`;
  const jsonFilePath = path.join(matchedDataDir, jsonFilename);
  console.log(`Looking for matched data file: ${jsonFilePath}`);
  
  let jsonFiles = [];
  if (fs.existsSync(jsonFilePath)) {
    jsonFiles.push(jsonFilePath);
  }
  console.log(`Found ${jsonFiles.length} matched data files for model ${modelName}: ${jsonFiles.join(', ')}`);
  
  if (jsonFiles.length === 0) {
    console.log(`No matched data JSON file found for model ${modelName}, skipping...`);
    return;
  }
  
  const jsonFile = jsonFiles[0];
  
  // Create model-specific output directory
  const modelDir = path.join(completeTestsDir, modelName);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
    console.log(`Created model directory: ${modelDir}`);
  } else {
    console.log(`Model directory already exists: ${modelDir}`);
  }
  
  console.log(`Processing matched data ${jsonFile} into ${modelDir}...`);
  
  // Read and parse the JSON data
  console.log(`Reading JSON file: ${jsonFile}`);
  let jsonData;
  try {
    const jsonContent = fs.readFileSync(jsonFile, 'utf8');
    console.log(`JSON content length: ${jsonContent.length} characters`);
    jsonData = JSON.parse(jsonContent);
    console.log(`Parsed ${jsonData.length} entries from JSON file`);
  } catch (err) {
    console.error(`Error reading or parsing JSON file: ${err.message}`);
    return;
  }

  // Process each entry in the JSON data
  let processedCount = 0;
  jsonData.forEach((entry, index) => {
    console.log(`Processing entry ${index + 1}/${jsonData.length}`);
    stats.total++;
    
    if (entry.output_file && entry.code) {
      console.log(`Entry ${index + 1} has output_file and code fields`);
      
      const outputFileName = path.basename(entry.output_file);
      console.log(`Output file name: ${outputFileName}`);
      
      const filePrefix = outputFileName.split('_response_')[0];
      console.log(`File prefix: ${filePrefix}`);
      
      // Try both .ts and .js extensions
      let sourcePath = path.join(resultsDir, `${filePrefix}.ts`);
      if (!fs.existsSync(sourcePath)) {
        sourcePath = path.join(resultsDir, `${filePrefix}.js`);
      }
      console.log(`Source path: ${sourcePath}`);
      console.log(`Source file exists?: ${fs.existsSync(sourcePath) ? 'Yes' : 'No'}`);
      
      // SOLO procesar si existe el archivo plantilla
      if (fs.existsSync(sourcePath)) {
        const sourceExt = path.extname(sourcePath);
        const destPath = path.join(modelDir, `${filePrefix}${sourceExt}`);
        console.log(`Destination path: ${destPath}`);
        
        try {
          // Process with AST
          const result = processFileWithAST(sourcePath, destPath, entry.code);
          
          if (result.modified) {
            stats.modified++;
            console.log(`✅ Modified file: ${destPath}`);
          } else {
            stats.copied++;
            console.log(`📋 Copied file as-is: ${destPath} (${result.reason})`);
          }
          
          processedCount++;
        } catch (err) {
          console.error(`❌ Error processing file ${sourcePath}:`, err);
          stats.errors++;
        }
      } else {
        // NO generar archivo, solo informar y contar como skipped
        console.log(`⚠️  Template file ${sourcePath} not found, skipping entry ${index + 1}`);
        stats.skipped++;
      }
    } else {
      console.log(`Entry ${index + 1} missing output_file or code fields`);
      stats.invalid++;
    }
  });
  
  console.log(`Processed ${processedCount} files for model ${modelName}`);
});

console.log('=== AST-BASED TEST GENERATOR COMPLETED ===');
console.log('📊 Processing Statistics:');
console.log(`   Total entries processed: ${stats.total}`);
console.log(`   Files modified with AST: ${stats.modified}`);
console.log(`   Files copied as-is: ${stats.copied}`);
console.log(`   Entries skipped (no template): ${stats.skipped}`);
console.log(`   Invalid entries: ${stats.invalid}`);
console.log(`   Errors encountered: ${stats.errors}`);

