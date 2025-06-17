const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Read the extracted test info JSON
const extractedInfoPath = path.resolve(__dirname, 'extracted-test-info.json');
const extractedInfo = JSON.parse(fs.readFileSync(extractedInfoPath, 'utf8'));

// Process directories function
async function processDirectories() {
  const baseDir = path.resolve(__dirname, '..', 'ui', 'complete_tests');
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

// Process a file with TypeScript AST
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
  const filePrefix = fileName.replace(/\d+\.spec\.ts$/, '.spec.ts');
  
  if (!extractedInfo[filePrefix]) {
    console.log(`No information found for ${filePrefix}`);
    return;
  }

  // Process the AST
  const updates = [];
  
  function visit(node) {
    // Look for property access expressions (e.g., userInfo.username)
    if (ts.isPropertyAccessExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression)) {
        const objectName = expression.text;
        const propertyName = node.name.text;
        
        // Check if we have this data in our extracted info
        if (
          extractedInfo[filePrefix] && 
          extractedInfo[filePrefix][objectName] && 
          extractedInfo[filePrefix][objectName][propertyName] !== undefined
        ) {
          const value = extractedInfo[filePrefix][objectName][propertyName];
          const start = node.getStart(sourceFile);
          const end = node.getEnd();
          
          // Format the replacement based on the type
          let replacement;
          if (typeof value === 'string') {
            replacement = `"${value}"`;
          } else if (Array.isArray(value)) {
            replacement = JSON.stringify(value);
          } else {
            replacement = String(value);
          }
          
          updates.push({
            start,
            end,
            replacement
          });
        }
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  // Start the visitor
  ts.forEachChild(sourceFile, visit);
  
  // Apply updates in reverse order to avoid position shifts
  if (updates.length > 0) {
    let updatedContent = fileContent;
    updates
      .sort((a, b) => b.start - a.start) // Sort in reverse
      .forEach(update => {
        updatedContent = 
          updatedContent.slice(0, update.start) + 
          update.replacement + 
          updatedContent.slice(update.end);
      });
    
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Updated ${filePath} with ${updates.length} changes`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

// Run the script
processDirectories()
  .then(() => console.log('Done processing all files'))
  .catch(err => console.error('Error:', err));
