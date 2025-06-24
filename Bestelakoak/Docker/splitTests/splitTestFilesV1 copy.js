const fs = require('fs');
const path = require('path');

/**
 * Split Cypress test files into separate files, one for each 'it' block
 * @param {string} folderPath - The folder containing test files to process
 * @param {string} outputFolder - The folder to output split test files (default: 'split-tests')
 */
function splitTestFiles(folderPath, outputFolder = 'split-tests') {
  // Find all .spec.ts files in the folder
  const files = fs.readdirSync(folderPath)
    .filter(file => file.endsWith('.spec.ts') && !file.match(/-\d+\.spec\.ts$/)) // Skip already processed files
    .map(file => path.join(folderPath, file));
  
  console.log(`Found ${files.length} test files to process...`);
  
  // Create output directory if it doesn't exist
  const outputPath = path.join(folderPath, outputFolder);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(`Created output folder: ${outputPath}`);
  }
  
  files.forEach(file => processFile(file, outputPath));
}

/**
 * Process a single test file, creating individual files for each test
 * @param {string} filePath - Path to the test file
 * @param {string} outputDir - Directory to output split test files
 */
function processFile(filePath, outputDir) {
  const filename = path.basename(filePath);
  const baseName = filename.replace('.spec.ts', '');
  
  console.log(`Processing ${filename}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');

  // Find all the 'it' blocks
  const itBlocks = findItBlocks(content);
  
  if (itBlocks.length === 0) {
    console.log(`No test blocks found in ${filename}`);
    return;
  }
  
  console.log(`Found ${itBlocks.length} test blocks in ${filename}`);
  
  // For each it block, create a new file with only that it block active
  itBlocks.forEach((itBlock, index) => {
    // Start with the original content
    let newContent = content;
    
    // Remove all it blocks except the current one
    itBlocks.forEach((block, blockIndex) => {
      if (blockIndex !== index) {
        // Remove the it block entirely, including any leading or trailing whitespace
        // First, capture the pattern with potential leading/trailing empty lines
        const pattern = new RegExp(`(\\s*?)${escapeRegExp(block.text)}(\\s*?)`, 'g');
        newContent = newContent.replace(pattern, '');
      }
    });
    
    // Clean up multiple consecutive blank lines (replace 2+ consecutive newlines with a single newline)
    newContent = newContent.replace(/(\r?\n){2,}/g, '\n');
    
    // Clean up specific patterns of whitespace around remaining it block
    newContent = newContent.replace(/\(\) => \{\s*\}\);(\s*)\}\);/g, '() => { });\n});');
    
    // Create new filename with index
    const newFileName = `${baseName}-${index + 1}.spec.ts`;
    const newFilePath = path.join(outputDir, newFileName);
    
    // Write the new file
    fs.writeFileSync(newFilePath, newContent);
    console.log(`Created ${newFileName} for test: "${itBlock.name}"`);
  });
}

/**
 * Find all 'it' blocks in the content
 * @param {string} content - The file content
 * @returns {Array} - Array of objects with the it block text and name
 */
function findItBlocks(content) {
  const itBlocks = [];
  const itRegex = /it\s*\(\s*(['"`])(.*?)\1\s*,\s*(?:async\s*)?\(\s*.*?\s*\)\s*=>\s*\{[\s\S]*?(?=\s*\}\s*\)\s*;?\s*(?:it|\}\s*\)|\}|$))\s*\}\s*\)\s*;?/g;
  
  let match;
  while ((match = itRegex.exec(content)) !== null) {
    itBlocks.push({
      text: match[0],
      name: match[2]
    });
  }
  
  return itBlocks;
}

/**
 * Escape special characters in string for use in RegExp
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if folder path was provided as command line argument
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a folder path as an argument');
  process.exit(1);
}

const folderPath = args[0];
if (!fs.existsSync(folderPath)) {
  console.error(`Folder does not exist: ${folderPath}`);
  process.exit(1);
}

// Get optional output folder name
const outputFolder = args[1] || 'split-tests';

// Run the function
splitTestFiles(folderPath, outputFolder);