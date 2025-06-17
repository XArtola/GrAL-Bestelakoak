const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Read the extracted test info JSON
const extractedInfoPath = path.resolve(__dirname, 'extracted-test-info.json');
const extractedInfo = JSON.parse(fs.readFileSync(extractedInfoPath, 'utf8'));

// Statistics tracking
const stats = {
  totalDirectories: 0,
  totalFiles: 0,
  filesProcessed: 0,
  filesUpdated: 0,
  filesSkipped: 0,
  replacementsMade: 0,
  errors: 0,
  details: []
};

// Process directories function
async function processDirectories() {
  const baseDir = path.resolve(__dirname, '..', 'ui', 'complete_tests');
  const dirs = fs.readdirSync(baseDir).filter(file => 
    fs.statSync(path.join(baseDir, file)).isDirectory()
  );

  stats.totalDirectories = dirs.length; // Track total directories

  for (const dir of dirs) {
    console.log(`Processing directory: ${dir}`);
    await processFilesInDirectory(path.join(baseDir, dir));
  }
}

// Process files in a directory
async function processFilesInDirectory(dirPath) {
  const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.spec.ts'));
  
  stats.totalFiles += files.length; // Track total files
  
  for (const file of files) {
    console.log(`Processing file: ${file}`);
    await processFile(path.join(dirPath, file));
  }
}

// Process a file with AST
async function processFile(filePath) {
  try {
    stats.filesProcessed++;
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );    // Determine which extracted info to use based on file name
    const fileName = path.basename(filePath);
    let extractedDataKey;
    
    // Special handling for different file patterns
    if (fileName.startsWith('auth0')) {
      // auth0.spec.ts is a special case
      extractedDataKey = "auth0.spec.ts";
    } else if (fileName.startsWith('auth')) {
      // auth1.spec.ts, auth2.spec.ts, etc. -> auth.spec.ts
      extractedDataKey = "auth.spec.ts";
    } else {
      // Remove number suffix: bankaccounts3.spec.ts -> bankaccounts.spec.ts
      extractedDataKey = fileName.replace(/\d+\.spec\.ts$/, '.spec.ts');    }
    
    console.log(`  📁 ${fileName} → ${extractedDataKey}`);
    
    if (!extractedInfo[extractedDataKey]) {
      console.log(`  ❌ No information found for ${extractedDataKey}`);
      console.log(`  Available keys: ${Object.keys(extractedInfo).join(', ')}`);
      stats.filesSkipped++;
      stats.details.push({
        file: fileName,
        status: 'skipped',
        reason: `No data for key: ${extractedDataKey}`,
        replacements: 0
      });
      return;
    }    console.log(`  ✅ Processing ${fileName} with key: ${extractedDataKey}`);
    
    // Process the file
    const processResult = processNode(sourceFile, fileContent, extractedInfo[extractedDataKey]);
    
    // Write back to file if changed
    if (processResult.modifiedContent !== fileContent) {
      fs.writeFileSync(filePath, processResult.modifiedContent);
      console.log(`Updated ${filePath} (${processResult.replacementCount} replacements)`);
      stats.filesUpdated++;
      stats.replacementsMade += processResult.replacementCount;
      stats.details.push({
        file: fileName,
        status: 'updated',
        reason: 'Variables replaced',
        replacements: processResult.replacementCount
      });
    } else {
      console.log(`No changes needed for ${filePath}`);
      stats.details.push({
        file: fileName,
        status: 'no-changes',
        reason: 'No variables to replace',
        replacements: 0
      });
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    stats.errors++;
    stats.details.push({
      file: path.basename(filePath),
      status: 'error',
      reason: error.message,
      replacements: 0
    });
  }
}

// Process AST nodes recursively
function processNode(node, fileContent, extractedData) {
  let result = fileContent;
  let replacementCount = 0;
  const sourceFile = node; // The top-level node is the source file

  // Variable mapping - maps variable names in code to object names in JSON
  const variableMapping = {
    'userInfo': 'bankAccountInfo',  // userInfo.bankName -> bankAccountInfo.bankName
    'user': 'userInfo',             // user.username -> userInfo.username
    'ctx': 'authenticatedUser',     // ctx.authenticatedUser -> authenticatedUser (if exists)
    'credentials': 'loginCredentials', // credentials.password -> loginCredentials.password
    'updated': 'updatedUserInfo'    // updated.firstName -> updatedUserInfo.firstName
  };
  console.log(`  🔍 Processing AST...`);

  // Visit each node in the AST
  function visit(node) {
    // Check for property access expressions (e.g., userInfo.username)
    if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
      const expression = node.expression;
      
      if (expression && expression.escapedText) {
        const objectName = expression.escapedText;
        const propertyName = node.name && node.name.escapedText;        
        // Handle nested property access like userInfo.bankAccountInfo.bankName
        if (expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
          const parentExpression = expression.expression;
          const parentProperty = expression.name;
          
          if (parentExpression && parentExpression.escapedText && 
              parentProperty && parentProperty.escapedText) {
            const rootObject = parentExpression.escapedText;
            const nestedProperty = parentProperty.escapedText;
            
            // Special case: userInfo.bankAccountInfo.X -> bankAccountInfo.X
            if (rootObject === 'userInfo' && nestedProperty === 'bankAccountInfo') {
              if (extractedData['bankAccountInfo'] && extractedData['bankAccountInfo'][propertyName] !== undefined) {
                const value = extractedData['bankAccountInfo'][propertyName];
                
                let valueText;
                if (typeof value === 'string') {
                  valueText = `"${value}"`;
                } else if (Array.isArray(value)) {
                  valueText = JSON.stringify(value);
                } else {
                  valueText = String(value);
                }
                
                const start = node.getStart(sourceFile);
                const end = node.getEnd();
                const textToReplace = fileContent.substring(start, end);
                
                result = result.replace(textToReplace, valueText);
                replacementCount++;
                console.log(`  ✅ Nested replacement: ${rootObject}.${nestedProperty}.${propertyName} → ${valueText}`);
                return; // Exit early since we handled this case
              }
            }
            
            // Try direct nested mapping
            if (extractedData[nestedProperty] && extractedData[nestedProperty][propertyName] !== undefined) {
              const value = extractedData[nestedProperty][propertyName];
              
              let valueText;
              if (typeof value === 'string') {
                valueText = `"${value}"`;
              } else if (Array.isArray(value)) {
                valueText = JSON.stringify(value);
              } else {
                valueText = String(value);
              }
              
              const start = node.getStart(sourceFile);
              const end = node.getEnd();
              const textToReplace = fileContent.substring(start, end);
              
              result = result.replace(textToReplace, valueText);
              replacementCount++;
              console.log(`  ✅ Direct nested replacement: ${rootObject}.${nestedProperty}.${propertyName} → ${valueText}`);
              return; // Exit early since we handled this case
            }
          }
        }
        if (expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
          const nestedExpression = expression.expression;
          const nestedProperty = expression.name;
          
          if (nestedExpression && nestedExpression.escapedText && nestedProperty && nestedProperty.escapedText) {
            const rootObject = nestedExpression.escapedText;
            const nestedPropertyName = nestedProperty.escapedText;
              // Check if we can map this nested access directly
            if (extractedData[nestedPropertyName] && extractedData[nestedPropertyName][propertyName] !== undefined) {
              const value = extractedData[nestedPropertyName][propertyName];
              
              let valueText;
              if (typeof value === 'string') {
                valueText = `"${value}"`;
              } else if (Array.isArray(value)) {
                valueText = JSON.stringify(value);
              } else {
                valueText = String(value);
              }
              
              const start = node.getStart(sourceFile);
              const end = node.getEnd();
              const textToReplace = fileContent.substring(start, end);
                result = result.replace(textToReplace, valueText);
              replacementCount++;
              return; // Exit early since we handled this case
            }
          }
        }
        
        // Try direct match first
        let dataKey = objectName;
        if (extractedData[dataKey] && propertyName) {            // If the property exists in our extracted data
          if (extractedData[dataKey][propertyName] !== undefined) {
            const value = extractedData[dataKey][propertyName];
            
            // Replace the property access with the literal value
            let valueText;
            if (typeof value === 'string') {
              valueText = `"${value}"`;
            } else if (Array.isArray(value)) {
              valueText = JSON.stringify(value);
            } else {
              valueText = String(value);
            }
            
            const start = node.getStart(sourceFile);
            const end = node.getEnd();
            const textToReplace = fileContent.substring(start, end);
            
            result = result.replace(textToReplace, valueText);
            replacementCount++;
            console.log(`  🔄 Replaced ${textToReplace} with ${valueText}`);
            return;
          } else {
            console.log(`  ❌ Property ${propertyName} not found in ${objectName} data`);
          }
        }
        
        // Try mapped variable name
        const mappedKey = variableMapping[objectName];
        if (mappedKey && extractedData[mappedKey] && propertyName) {          
          // If the property exists in our extracted data
          if (extractedData[mappedKey][propertyName] !== undefined) {
            const value = extractedData[mappedKey][propertyName];
            
            console.log(`  ✅ Mapped match: ${objectName}.${propertyName} -> ${mappedKey}.${propertyName} = ${value}`);
            
            // Replace the property access with the literal value
            let valueText;
            if (typeof value === 'string') {
              valueText = `"${value}"`;
            } else if (Array.isArray(value)) {
              valueText = JSON.stringify(value);
            } else {
              valueText = String(value);
            }
            
            const start = node.getStart(sourceFile);
            const end = node.getEnd();
            const textToReplace = fileContent.substring(start, end);
            
            result = result.replace(textToReplace, valueText);
            replacementCount++;
            console.log(`  🔄 Replaced ${textToReplace} with ${valueText}`);
            return;
          } else {
            console.log(`  ❌ Property ${propertyName} not found in mapped ${mappedKey} data`);
          }
        } else {
          console.log(`  ❌ Object ${objectName} not found in extracted data (tried: ${objectName}, ${mappedKey || 'none'})`);
        }
      }
    }
    
    // Continue processing child nodes
    ts.forEachChild(node, visit);
  }
  
  // Start recursion
  ts.forEachChild(node, visit);
  
  console.log(`  📊 Total replacements made: ${replacementCount}`);
  
  return {
    modifiedContent: result,
    replacementCount: replacementCount
  };
}

// Function to print summary table
function printSummaryTable() {
  console.log('\n' + '='.repeat(80));
  console.log('PROCESSING SUMMARY');
  console.log('='.repeat(80));
  
  // Summary statistics
  console.log('\nOverall Statistics:');
  console.log('┌─────────────────────────────────┬─────────┐');
  console.log('│ Metric                          │ Value   │');
  console.log('├─────────────────────────────────┼─────────┤');
  console.log(`│ Total Directories               │ ${stats.totalDirectories.toString().padStart(7)} │`);
  console.log(`│ Total Files Found               │ ${stats.totalFiles.toString().padStart(7)} │`);
  console.log(`│ Files Processed                 │ ${stats.filesProcessed.toString().padStart(7)} │`);
  console.log(`│ Files Updated                   │ ${stats.filesUpdated.toString().padStart(7)} │`);
  console.log(`│ Files Skipped/No Changes        │ ${(stats.totalFiles - stats.filesUpdated - stats.errors).toString().padStart(7)} │`);
  console.log(`│ Files with Errors               │ ${stats.errors.toString().padStart(7)} │`);  console.log(`│ Total Replacements Made         │ ${stats.replacementsMade.toString().padStart(7)} │`);
  console.log('└─────────────────────────────────┴─────────┘');
  
  // Success rate
  const successRate = stats.totalFiles > 0 ? ((stats.filesUpdated / stats.totalFiles) * 100).toFixed(1) : 0;
  console.log(`\nSuccess Rate: ${successRate}% (${stats.filesUpdated}/${stats.totalFiles} files updated)`);
  
  console.log('\n' + '='.repeat(80));
  console.log('PROCESSING COMPLETE');
  console.log('='.repeat(80));
}

// Run the script
processDirectories()
  .then(() => {
    console.log('\nDone processing all files');
    printSummaryTable();
  })
  .catch(err => {
    console.error('Error:', err);
    stats.errors++;
    printSummaryTable();
  });
