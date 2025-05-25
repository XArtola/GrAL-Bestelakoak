const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Read the extracted test info JSON
const extractedInfoPath = path.resolve(__dirname, 'extracted-test-info.json');
const extractedInfo = JSON.parse(fs.readFileSync(extractedInfoPath, 'utf8'));

// Process directories function
async function processDirectories() {
  const baseDir = path.resolve('C:\\Users\\xabia\\OneDrive\\Documentos\\4.Maila\\TFG-Bestelakoak\\Bestelakoak\\26_05_25-28_05_25\\ui\\complete_tests');
  const dirs = fs.readdirSync(baseDir).filter(file => 
    fs.statSync(path.join(baseDir, file)).isDirectory()
  );

  for (const dir of dirs) {
    console.log(`Processing directory: ${dir}`);
    await processFilesInDirectory(path.join(baseDir, dir));
  }
}

// Process files in a directory
async function processFilesInDirectory(dirPath) {
  const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.spec.ts'));
  
  for (const file of files) {
    console.log(`Processing file: ${file}`);
    await processFile(path.join(dirPath, file));
  }
}

// Process a file with AST
async function processFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  // Determine which extracted info to use based on file name
  const fileName = path.basename(filePath);
  let extractedDataKey;
  
  // Special handling for files starting with "auth"
  if (fileName.startsWith('auth')) {
    extractedDataKey = "auth.spec.ts";
  } else {
    extractedDataKey = fileName.replace(/\d+\.spec\.ts$/, '.spec.ts');
  }
  
  if (!extractedInfo[extractedDataKey]) {
    console.log(`No information found for ${extractedDataKey}`);
    return;
  }
  // Process the file
  const result = processNode(sourceFile, fileContent, extractedInfo[extractedDataKey]);
  
  // Write back to file if changed
  if (result !== fileContent) {
    fs.writeFileSync(filePath, result);
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

// Process AST nodes recursively
function processNode(node, fileContent, extractedData) {
  let result = fileContent;
  const sourceFile = node; // The top-level node is the source file

  // Visit each node in the AST
  function visit(node) {
    // Check for property access expressions (e.g., userInfo.username)
    if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
      const expression = node.expression;
      
      if (expression && expression.escapedText) {
        const objectName = expression.escapedText;
        
        // If the object is in our extracted data
        if (extractedData[objectName] && node.name && node.name.escapedText) {
          const propertyName = node.name.escapedText;
          
          // If the property exists in our extracted data
          if (extractedData[objectName][propertyName] !== undefined) {
            const value = extractedData[objectName][propertyName];
            
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
          }
        }
      }
    }
    
    // Continue processing child nodes
    ts.forEachChild(node, visit);
  }
  
  // Start recursion
  ts.forEachChild(node, visit);
  return result;
}

// Run the script
processDirectories()
  .then(() => console.log('Done processing all files'))
  .catch(err => console.error('Error:', err));
