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
            
            const testNameValue = t.isStringLiteral(testName) ? testName.value : 'unknown';
            console.log(`Found it() block: "${testNameValue}" (isEmpty: ${isEmpty})`);
            
            itBlocks.push({
              path,
              node,
              testName: testNameValue,
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
  try {    // Extremely aggressive cleaning for TypeScript files
    let cleanedCode = newCode
      .replace(/\r\r\n/g, '\n')                    // Fix line endings
      .replace(/\r\n/g, '\n')                      // Normalize line endings
      .replace(/\r/g, '\n')                        // Handle any remaining \r
      .replace(/<!--[\s\S]*?-->/g, '')             // Remove HTML comments
      .replace(/<[^>]*>/g, '')                     // Remove XML/HTML-like tags
      .replace(/^\s*tags:\s*$/gm, '')              // Remove "tags:" lines
      .replace(/^\/\/ it\(.*?\{.*?\}\);?\s*$/gm, '') // Remove commented it() blocks
      .replace(/^\/\/ \}\);?\s*$/gm, '')           // Remove commented closing braces
      .replace(/^\/\/ Original.*$/gm, '')          // Remove "Original" comments
      .replace(/^\/\/ Here we.*$/gm, '')           // Remove explanatory comments
      .replace(/^\/\/ NOTE:.*$/gm, '')             // Remove NOTE comments
      .replace(/^\/\/ Log the.*$/gm, '')           // Remove log comments
      .replace(/_.each\([^)]*\)\s*=>\s*\{[\s\S]*?\}\);?/g, '') // Remove _.each blocks
      .replace(/const\s+\w+\s*=\s*[^;]+;?\s*$/gm, '') // Remove problematic const declarations
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed !== '' && 
               !trimmed.startsWith('<!--') && 
               !trimmed.startsWith('<') && 
               !trimmed.endsWith('>') &&
               !trimmed.startsWith('tags:') &&
               !trimmed.match(/^\/\/ it\(/) &&
               !trimmed.match(/^\/\/ Original/) &&
               !trimmed.match(/^\/\/ Here we/) &&
               !trimmed.match(/^\/\/ NOTE:/) &&
               !trimmed.match(/^\/\/ Log the/) &&
               !trimmed.includes('_.each') &&
               trimmed !== '// });';
      })
      .join('\n')
      .trim();

    if (!cleanedCode) {
      console.log('No valid code after cleaning, using placeholder');
      cleanedCode = '// Test implementation\ncy.log("Test needs implementation");';
    }

    // If the code is still too complex, extract only simple cy. commands
    if (cleanedCode.includes('expect(') && cleanedCode.includes('cy.request')) {
      console.log('Code contains complex patterns, extracting only cy commands');
      const cyCommands = cleanedCode
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return (trimmed.startsWith('cy.') && 
                 !trimmed.includes('expect(') && 
                 !trimmed.includes('cy.request') &&
                 !trimmed.includes('cy.database')) ||
                 trimmed.startsWith('//');
        })
        .join('\n');
      
      if (cyCommands.trim()) {
        cleanedCode = cyCommands;
        console.log(`Simplified to cy commands only`);
      }
    }

    // Final fallback: if still too complex, create a simple placeholder
    if (cleanedCode.length > 3000 || cleanedCode.includes('interception') || cleanedCode.includes('transactionResp')) {
      cleanedCode = '// Test implementation\ncy.log("Complex test - needs manual implementation");';
      console.log('Using fallback placeholder code for complex test');
    }

    console.log(`Cleaned code preview:\n${cleanedCode.substring(0, 300)}...`);
    
    // Try multiple parsing strategies
    let statements = null;
    
    // Strategy 1: Try parsing as-is (for simple code)
    try {
      const directAst = parser.parse(cleanedCode, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: ['typescript', 'jsx']
      });
      
      if (directAst.body && directAst.body.length > 0) {
        statements = directAst.body;
        console.log(`Strategy 1 success: Direct parsing with ${statements.length} statements`);
      }
    } catch (e) {
      console.log('Strategy 1 failed: Direct parsing');
    }
    
    // Strategy 2: Wrap in function (for code that needs context)
    if (!statements) {
      try {
        const wrappedCode = `function temp() {\n${cleanedCode}\n}`;
        const wrappedAst = parser.parse(wrappedCode, {
          sourceType: 'module',
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
          plugins: ['typescript', 'jsx', 'asyncGenerators', 'functionBind']
        });
        
        if (wrappedAst.body && wrappedAst.body[0] && t.isFunctionDeclaration(wrappedAst.body[0])) {
          statements = wrappedAst.body[0].body.body;
          console.log(`Strategy 2 success: Wrapped parsing with ${statements.length} statements`);
        }
      } catch (e) {
        console.log('Strategy 2 failed: Wrapped parsing');
      }
    }
    
    // Strategy 3: Try parsing individual lines as expressions/statements
    if (!statements) {
      try {
        const lines = cleanedCode.split('\n').filter(line => line.trim());
        const parsedStatements = [];
        
        for (const line of lines) {
          try {
            // Try to parse each line as a statement
            const lineAst = parser.parse(line, {
              sourceType: 'module',
              allowImportExportEverywhere: true,
              allowReturnOutsideFunction: true,
              plugins: ['typescript', 'jsx']
            });
            
            if (lineAst.body && lineAst.body.length > 0) {
              parsedStatements.push(...lineAst.body);
            }
          } catch (lineError) {
            // Try wrapping the line in an expression statement
            try {
              const wrappedLine = `(${line});`;
              const wrappedLineAst = parser.parse(wrappedLine, {
                sourceType: 'module',
                allowImportExportEverywhere: true,
                plugins: ['typescript', 'jsx']
              });
              if (wrappedLineAst.body && wrappedLineAst.body.length > 0) {
                parsedStatements.push(...wrappedLineAst.body);
              }
            } catch (e) {
              console.log(`Failed to parse line: ${line.substring(0, 50)}...`);
            }
          }
        }
        
        if (parsedStatements.length > 0) {
          statements = parsedStatements;
          console.log(`Strategy 3 success: Line-by-line parsing with ${statements.length} statements`);
        }
      } catch (e) {
        console.log('Strategy 3 failed: Line-by-line parsing');
      }
    }
    
    if (!statements || statements.length === 0) {
      console.log('All parsing strategies failed - no valid statements found');
      return false;
    }
    
    // Insert the statements into the it() block
    const callback = targetItBlock.callback;
    if (t.isBlockStatement(callback.body)) {
      callback.body.body = statements;
      console.log(`✅ Successfully inserted ${statements.length} statements into existing block`);
    } else {
      callback.body = t.blockStatement(statements);
      console.log(`✅ Successfully created new block with ${statements.length} statements`);
    }
      return true;
  } catch (error) {
    console.error('❌ All parsing strategies failed:', error.message);
    console.error('Error stack:', error.stack);
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
      // Generate the modified code with proper formatting and indentation
    const result = generate(ast, {
      retainLines: false,
      compact: false,
      concise: false,
      quotes: 'double',
      jsescOption: {
        quotes: 'double',
        wrap: false
      },
      // Proper indentation settings
      indent: {
        style: '  ', // 2-space indentation
        base: 0
      }
    });
    
    // Post-process the generated code to ensure proper indentation within it() blocks
    let finalCode = result.code;
    
    // Fix common indentation issues in Cypress test code
    finalCode = finalCode
      .replace(/\n {2}\/\/ /g, '\n      // ')  // Indent comments properly within it() blocks
      .replace(/\n {2}cy\./g, '\n      cy.')   // Indent cy commands properly
      .replace(/\n {2}}\);/g, '\n    });')     // Proper closing brace for it() blocks
      .replace(/\r\n/g, '\n');                 // Normalize line endings
    
    console.log(`Generated code preview (first 200 chars):\n${finalCode.substring(0, 200)}...`);
    
    // Write the modified content
    fs.writeFileSync(destPath, finalCode);
    console.log(`Successfully modified and saved file: ${destPath}`);
    
    return { modified: true, reason: 'success' };
    
  } catch (error) {
    console.error(`Error processing file with AST: ${error.message}`);
    console.log('Falling back to copying original file');
    fs.copyFileSync(sourcePath, destPath);
    return { modified: false, reason: 'error', error: error.message };
  }
}

/**
 * Copy all template files from results directory to model directory
 */
function copyTemplateFiles(resultsDir, modelDir) {
  console.log(`Copying template files from ${resultsDir} to ${modelDir}...`);
  
  if (!fs.existsSync(resultsDir)) {
    console.error(`Results directory does not exist: ${resultsDir}`);
    return false;
  }
  
  const templateFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  console.log(`Found ${templateFiles.length} template files to copy`);
  
  let copiedCount = 0;
  templateFiles.forEach(templateFile => {
    const sourcePath = path.join(resultsDir, templateFile);
    const destPath = path.join(modelDir, templateFile);
    
    try {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied: ${templateFile}`);
      copiedCount++;
    } catch (error) {
      console.error(`❌ Failed to copy ${templateFile}:`, error.message);
    }
  });
  
  console.log(`Successfully copied ${copiedCount}/${templateFiles.length} template files`);
  return copiedCount > 0;
}

/**
 * Process a single file and insert code using simple string replacement
 */
function processAndInsertCode(filePath, codeToInsert) {
  try {
    console.log(`Processing file: ${path.basename(filePath)}`);
    
    // Read the file
    const originalContent = fs.readFileSync(filePath, 'utf8');
    
    // Clean the code to insert
    let cleanedCode = codeToInsert
      .replace(/\r\r\n/g, '\n')           // Fix line endings
      .replace(/\r\n/g, '\n')             // Normalize line endings
      .replace(/\r/g, '\n')               // Handle any remaining \r
      .replace(/<!--[\s\S]*?-->/g, '')    // Remove HTML comments
      .replace(/<[^>]*>/g, '')            // Remove XML/HTML-like tags
      .replace(/^\s*tags:\s*$/gm, '')     // Remove "tags:" lines
      .trim();

    if (!cleanedCode) {
      console.log('No valid code after cleaning');
      return { modified: false, reason: 'no_code_after_cleaning' };
    }

    console.log(`Code to insert:\n${cleanedCode.substring(0, 200)}...`);

    // Find empty it() blocks using regex
    const itBlockRegex = /it\s*\(\s*['"`]([^'"`]*?)['"`]\s*,\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g;
    
    let match;
    let modified = false;
    let newContent = originalContent;

    while ((match = itBlockRegex.exec(originalContent)) !== null) {
      const fullMatch = match[0];
      const testName = match[1];
      
      console.log(`Found empty it() block: "${testName}"`);
      
      // Create the replacement with proper indentation
      const indentedCode = cleanedCode
        .split('\n')
        .map(line => line.trim() ? `    ${line}` : line) // Add 4 spaces for it() block content
        .join('\n');
      
      const replacement = `it('${testName}', () => {
${indentedCode}
  })`;
      
      // Replace the first empty it() block found
      newContent = newContent.replace(fullMatch, replacement);
      modified = true;
      console.log(`✅ Replaced empty it() block: "${testName}"`);
      break; // Only replace the first empty block
    }

    if (!modified) {
      // Try alternative patterns for it() blocks
      const itBlockRegex2 = /it\s*\(\s*['"`]([^'"`]*?)['"`]\s*,\s*\(\s*\)\s*=>\s*\{\s*\}/g;
      
      while ((match = itBlockRegex2.exec(originalContent)) !== null) {
        const fullMatch = match[0];
        const testName = match[1];
        
        console.log(`Found empty it() block (pattern 2): "${testName}"`);
        
        // Create the replacement with proper indentation
        const indentedCode = cleanedCode
          .split('\n')
          .map(line => line.trim() ? `    ${line}` : line)
          .join('\n');
        
        const replacement = `it('${testName}', () => {
${indentedCode}
  }`;
        
        newContent = newContent.replace(fullMatch, replacement);
        modified = true;
        console.log(`✅ Replaced empty it() block (pattern 2): "${testName}"`);
        break;
      }
    }

    if (modified) {
      // Write the modified content back to the file
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Successfully inserted code into ${path.basename(filePath)}`);
      return { modified: true, reason: 'success' };
    } else {
      console.log(`No empty it() blocks found in ${path.basename(filePath)}`);
      return { modified: false, reason: 'no_empty_it_blocks' };
    }
    
  } catch (error) {
    console.error(`❌ Error processing file ${path.basename(filePath)}:`, error.message);
    return { modified: false, reason: 'error', error: error.message };
  }
}

// Look for matched data JSON files directly
const matchedDataDir = path.join(__dirname, '..', 'vscode_automation', 'matched_data');
console.log(`Matched data directory: ${matchedDataDir}`);
console.log(`Directory exists?: ${fs.existsSync(matchedDataDir) ? 'Yes' : 'No'}`);

// Find all JSON files with matched_data_ prefix
let jsonFiles = [];
try {
  if (options.folder) {
    // If a specific file is specified, use it
    const filePath = options.folder.endsWith('.json') 
      ? path.join(matchedDataDir, options.folder)
      : path.join(matchedDataDir, `${options.folder}.json`);
    
    if (fs.existsSync(filePath)) {
      jsonFiles = [filePath];
      console.log(`Using specified file: ${filePath}`);
    } else {
      console.error(`Specified file does not exist: ${filePath}`);
      process.exit(1);
    }
  } else {
    const allFiles = fs.readdirSync(matchedDataDir);
    jsonFiles = allFiles
      .filter(file => file.startsWith('matched_data_') && file.endsWith('.json'))
      .map(file => path.join(matchedDataDir, file));
  }
  
  console.log(`Found ${jsonFiles.length} JSON ${jsonFiles.length === 1 ? 'file' : 'files'}: ${jsonFiles.map(f => path.basename(f)).join(', ')}`);
} catch (err) {
  console.error(`Error accessing matched data directory: ${err.message}`);
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

// Process each JSON file
jsonFiles.forEach(jsonFile => {
  const fileName = path.basename(jsonFile);
  // Extract model name from filename: matched_data_gpt_4_1.json -> gpt_4_1
  const modelName = fileName.replace('matched_data_', '').replace('.json', '');
  
  console.log(`\n=== Processing JSON file ${fileName} for model ${modelName} ===`);
  
  // Create model-specific output directory
  const modelDir = path.join(completeTestsDir, modelName);
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
    console.log(`Created model directory: ${modelDir}`);
  } else {
    console.log(`Model directory already exists: ${modelDir}`);
  }
  
  // STEP 1: Copy all template files from results directory to model directory
  console.log(`\n--- STEP 1: Copying template files ---`);
  const copySuccess = copyTemplateFiles(resultsDir, modelDir);
  
  if (!copySuccess) {
    console.error(`Failed to copy template files for model ${modelName}, skipping...`);
    return;
  }
  
  // STEP 2: Read and parse the JSON data
  console.log(`\n--- STEP 2: Reading matched data ---`);
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
  
  // STEP 3: Process each entry and insert code into corresponding files
  console.log(`\n--- STEP 3: Inserting code into template files ---`);
  let processedCount = 0;
  
  jsonData.forEach((entry, index) => {
    console.log(`\nProcessing entry ${index + 1}/${jsonData.length}`);
    stats.total++;
    
    // Check if entry has required fields
    if (!entry.code || !entry.testId) {
      console.log(`Entry ${index + 1} missing code field or testId field`);
      stats.invalid++;
      return;
    }
    
    console.log(`Entry ${index + 1} - testId: ${entry.testId}`);
      // Find the corresponding file in the model directory
    let targetFilePath = path.join(modelDir, `${entry.testId}.spec.ts`);
    let targetFileExists = fs.existsSync(targetFilePath);
    
    // Try .js extension if .ts doesn't exist
    if (!targetFileExists) {
      targetFilePath = path.join(modelDir, `${entry.testId}.spec.js`);
      targetFileExists = fs.existsSync(targetFilePath);
      if (targetFileExists) {
        console.log(`Found .js file instead: ${path.basename(targetFilePath)}`);
      }
    }
    
    if (!targetFileExists) {
      console.log(`⚠️  No template file found for testId: ${entry.testId}, skipping entry ${index + 1}`);
      stats.skipped++;
      return;
    }
    
    console.log(`Target file: ${path.basename(targetFilePath)}`);
    
    // Insert code into the target file
    try {
      const result = processAndInsertCode(targetFilePath, entry.code);
      
      if (result.modified) {
        stats.modified++;
        console.log(`✅ Successfully inserted code for testId: ${entry.testId}`);
      } else {
        stats.copied++;
        console.log(`📋 File unchanged for testId: ${entry.testId} (${result.reason})`);
      }
      
      processedCount++;
    } catch (err) {
      console.error(`❌ Error processing testId ${entry.testId}:`, err);
      stats.errors++;
    }
  });
  
  console.log(`\n=== Completed processing model ${modelName} ===`);
  console.log(`Processed ${processedCount} entries for model ${modelName}`);
});

console.log('=== AST-BASED TEST GENERATOR COMPLETED ===');
console.log('📊 Processing Statistics:');
console.log(`   Total entries processed: ${stats.total}`);
console.log(`   Files modified with AST: ${stats.modified}`);
console.log(`   Files copied as-is: ${stats.copied}`);
console.log(`   Entries skipped (no template): ${stats.skipped}`);
console.log(`   Invalid entries: ${stats.invalid}`);
console.log(`   Errors encountered: ${stats.errors}`);

// Create summary table
console.log('\n📋 SUMMARY TABLE');
console.log('┌─────────────────────────────┬───────┬────────────┐');
console.log('│ Metric                      │ Count │ Percentage │');
console.log('├─────────────────────────────┼───────┼────────────┤');
console.log(`│ Total Entries               │ ${stats.total.toString().padStart(5)} │      100% │`);
console.log(`│ Successfully Modified       │ ${stats.modified.toString().padStart(5)} │ ${((stats.modified / stats.total) * 100).toFixed(1).padStart(8)}% │`);
console.log(`│ Copied Without Changes      │ ${stats.copied.toString().padStart(5)} │ ${((stats.copied / stats.total) * 100).toFixed(1).padStart(8)}% │`);
console.log(`│ Skipped (No Template)       │ ${stats.skipped.toString().padStart(5)} │ ${((stats.skipped / stats.total) * 100).toFixed(1).padStart(8)}% │`);
console.log(`│ Invalid Entries             │ ${stats.invalid.toString().padStart(5)} │ ${((stats.invalid / stats.total) * 100).toFixed(1).padStart(8)}% │`);
console.log(`│ Errors Encountered          │ ${stats.errors.toString().padStart(5)} │ ${((stats.errors / stats.total) * 100).toFixed(1).padStart(8)}% │`);
console.log('└─────────────────────────────┴───────┴────────────┘');

// Success rate calculation
const successRate = ((stats.modified + stats.copied) / stats.total) * 100;
const failureRate = ((stats.skipped + stats.invalid + stats.errors) / stats.total) * 100;

console.log('\n🎯 SUCCESS METRICS');
console.log(`   Success Rate: ${successRate.toFixed(1)}% (${stats.modified + stats.copied}/${stats.total})`);
console.log(`   Failure Rate: ${failureRate.toFixed(1)}% (${stats.skipped + stats.invalid + stats.errors}/${stats.total})`);
console.log(`   Code Insertion Rate: ${((stats.modified / stats.total) * 100).toFixed(1)}% (${stats.modified}/${stats.total})`);

// Performance indicators
if (successRate >= 90) {
  console.log('\n✅ EXCELLENT: Success rate above 90%');
} else if (successRate >= 75) {
  console.log('\n⚡ GOOD: Success rate above 75%');
} else if (successRate >= 50) {
  console.log('\n⚠️  MODERATE: Success rate above 50% - consider reviewing templates');
} else {
  console.log('\n❌ POOR: Success rate below 50% - review required');
}

// Time stamp
const endTime = new Date();
console.log(`\n⏰ Process completed at: ${endTime.toLocaleString()}`);
console.log(`📁 Output directory: ${path.resolve(completeTestsDir)}`);

// Final message
if (stats.modified > 0) {
  console.log(`\n🎉 Successfully generated ${stats.modified} test files with inserted code!`);
} else {
  console.log(`\n⚠️  No files were modified. Check the matched data and template files.`);
}

